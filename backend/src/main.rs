use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    routing::{delete, get},
    Json, Router,
};
use sqlx::SqlitePool;
use tower_http::cors::CorsLayer;

#[derive(Clone)]
struct AppState {
    db: SqlitePool,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    let database_url =
        std::env::var("DATABASE_URL").unwrap_or_else(|_| "sqlite:euporia.db?mode=rwc".to_string());
    let db = SqlitePool::connect(&database_url).await?;
    sqlx::migrate!().run(&db).await?;

    let state = AppState { db };

    let app = Router::new()
        .route("/health", get(health))
        .route("/", get(hello))
        // Taste profiles
        .route(
            "/api/profiles/{session_id}",
            get(get_profile).post(save_profile),
        )
        // Conversations
        .route(
            "/api/conversations/{session_id}",
            get(list_conversations).post(create_conversation),
        )
        .route(
            "/api/conversations/{session_id}/{conv_id}",
            get(get_conversation)
                .put(update_conversation)
                .delete(delete_conversation),
        )
        // AI insights cache
        .route(
            "/api/insights/{product_handle}",
            get(get_insight).post(save_insight),
        )
        // Cart sessions
        .route(
            "/api/cart-session/{session_id}",
            get(get_cart_session).post(save_cart_session),
        )
        // Wishlist
        .route(
            "/api/wishlist/{session_id}",
            get(list_wishlist).post(add_wishlist),
        )
        .route(
            "/api/wishlist/{session_id}/{id}",
            delete(delete_wishlist),
        )
        .layer(CorsLayer::permissive())
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3010").await?;
    tracing::info!("listening on {}", listener.local_addr()?);
    axum::serve(listener, app).await?;

    Ok(())
}

async fn health() -> &'static str {
    "ok"
}

async fn hello() -> Json<serde_json::Value> {
    Json(serde_json::json!({"message": "hello from euporia"}))
}

// ── Taste Profiles ──────────────────────────────────────────────────────────

async fn get_profile(
    State(state): State<AppState>,
    Path(session_id): Path<String>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let row: Option<String> =
        sqlx::query_scalar("SELECT profile_json FROM taste_profiles WHERE session_id = ?")
            .bind(&session_id)
            .fetch_optional(&state.db)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    match row {
        Some(json_str) => {
            let profile: serde_json::Value =
                serde_json::from_str(&json_str).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
            Ok(Json(serde_json::json!({
                "session_id": session_id,
                "profile": profile,
            })))
        }
        None => Err(StatusCode::NOT_FOUND),
    }
}

#[derive(serde::Deserialize)]
struct SaveProfileRequest {
    profile: serde_json::Value,
}

async fn save_profile(
    State(state): State<AppState>,
    Path(session_id): Path<String>,
    Json(body): Json<SaveProfileRequest>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let profile_json =
        serde_json::to_string(&body.profile).map_err(|_| StatusCode::BAD_REQUEST)?;

    sqlx::query(
        "INSERT INTO taste_profiles (session_id, profile_json) VALUES (?, ?)
         ON CONFLICT(session_id) DO UPDATE SET profile_json = excluded.profile_json, updated_at = datetime('now')",
    )
    .bind(&session_id)
    .bind(&profile_json)
    .execute(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(serde_json::json!({
        "session_id": session_id,
        "status": "saved",
    })))
}

// ── Conversations ───────────────────────────────────────────────────────────

type ConversationRow = (String, String, String, Option<String>, Option<String>);

async fn list_conversations(
    State(state): State<AppState>,
    Path(session_id): Path<String>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let rows: Vec<ConversationRow> = sqlx::query_as(
        "SELECT id, title, updated_at, category, icon FROM conversations WHERE session_id = ? ORDER BY updated_at DESC",
    )
    .bind(&session_id)
    .fetch_all(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let conversations: Vec<serde_json::Value> = rows
        .into_iter()
        .map(|(id, title, updated_at, category, icon)| {
            serde_json::json!({
                "id": id,
                "title": title,
                "updated_at": updated_at,
                "category": category,
                "icon": icon,
            })
        })
        .collect();

    Ok(Json(serde_json::json!({ "conversations": conversations })))
}

#[derive(serde::Deserialize)]
struct CreateConversationRequest {
    title: Option<String>,
}

async fn create_conversation(
    State(state): State<AppState>,
    Path(session_id): Path<String>,
    Json(body): Json<CreateConversationRequest>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let id = uuid::Uuid::new_v4().to_string();
    let title = body.title.unwrap_or_else(|| "New Chat".to_string());

    sqlx::query("INSERT INTO conversations (id, session_id, title) VALUES (?, ?, ?)")
        .bind(&id)
        .bind(&session_id)
        .bind(&title)
        .execute(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Create empty messages row
    let msg_id = uuid::Uuid::new_v4().to_string();
    sqlx::query(
        "INSERT INTO conversation_messages (id, conversation_id, messages_json) VALUES (?, ?, '[]')",
    )
    .bind(&msg_id)
    .bind(&id)
    .execute(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(serde_json::json!({ "id": id, "title": title })))
}

async fn get_conversation(
    State(state): State<AppState>,
    Path((_session_id, conv_id)): Path<(String, String)>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let row: Option<(String, String)> = sqlx::query_as(
        "SELECT c.title, COALESCE(m.messages_json, '[]')
         FROM conversations c
         LEFT JOIN conversation_messages m ON m.conversation_id = c.id
         WHERE c.id = ?",
    )
    .bind(&conv_id)
    .fetch_optional(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    match row {
        Some((title, messages_json)) => {
            let messages: serde_json::Value = serde_json::from_str(&messages_json)
                .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
            Ok(Json(serde_json::json!({
                "id": conv_id,
                "title": title,
                "messages": messages,
            })))
        }
        None => Err(StatusCode::NOT_FOUND),
    }
}

#[derive(serde::Deserialize)]
struct UpdateConversationRequest {
    title: Option<String>,
    messages: Option<serde_json::Value>,
}

async fn update_conversation(
    State(state): State<AppState>,
    Path((_session_id, conv_id)): Path<(String, String)>,
    Json(body): Json<UpdateConversationRequest>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    if let Some(title) = &body.title {
        sqlx::query("UPDATE conversations SET title = ?, updated_at = datetime('now') WHERE id = ?")
            .bind(title)
            .bind(&conv_id)
            .execute(&state.db)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    }

    if let Some(messages) = &body.messages {
        let json_str =
            serde_json::to_string(messages).map_err(|_| StatusCode::BAD_REQUEST)?;
        sqlx::query(
            "INSERT INTO conversation_messages (id, conversation_id, messages_json)
             VALUES (?, ?, ?)
             ON CONFLICT(conversation_id) DO UPDATE SET messages_json = excluded.messages_json, updated_at = datetime('now')",
        )
        .bind(uuid::Uuid::new_v4().to_string())
        .bind(&conv_id)
        .bind(&json_str)
        .execute(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    }

    // Update conversation timestamp
    sqlx::query("UPDATE conversations SET updated_at = datetime('now') WHERE id = ?")
        .bind(&conv_id)
        .execute(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(serde_json::json!({ "status": "updated" })))
}

async fn delete_conversation(
    State(state): State<AppState>,
    Path((_session_id, conv_id)): Path<(String, String)>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    sqlx::query("DELETE FROM conversations WHERE id = ?")
        .bind(&conv_id)
        .execute(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(serde_json::json!({ "status": "deleted" })))
}

// ── AI Insights Cache ───────────────────────────────────────────────────────

#[derive(serde::Deserialize)]
struct InsightQuery {
    store: Option<String>,
}

async fn get_insight(
    State(state): State<AppState>,
    Path(product_handle): Path<String>,
    Query(query): Query<InsightQuery>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let cache_key = match &query.store {
        Some(store) => format!("{store}:{product_handle}"),
        None => product_handle,
    };

    let row: Option<(String, String)> = sqlx::query_as(
        "SELECT insight_json, expires_at FROM ai_insights_cache WHERE product_handle = ?",
    )
    .bind(&cache_key)
    .fetch_optional(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    match row {
        Some((json_str, _expires_at)) => {
            let insight: serde_json::Value =
                serde_json::from_str(&json_str).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
            Ok(Json(insight))
        }
        None => Err(StatusCode::NOT_FOUND),
    }
}

#[derive(serde::Deserialize)]
struct SaveInsightRequest {
    insight: serde_json::Value,
}

async fn save_insight(
    State(state): State<AppState>,
    Path(product_handle): Path<String>,
    Query(query): Query<InsightQuery>,
    Json(body): Json<SaveInsightRequest>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let cache_key = match &query.store {
        Some(store) => format!("{store}:{product_handle}"),
        None => product_handle,
    };

    let json_str =
        serde_json::to_string(&body.insight).map_err(|_| StatusCode::BAD_REQUEST)?;
    let expires_at = (chrono::Utc::now() + chrono::Duration::hours(24))
        .format("%Y-%m-%d %H:%M:%S")
        .to_string();

    sqlx::query(
        "INSERT INTO ai_insights_cache (product_handle, insight_json, expires_at) VALUES (?, ?, ?)
         ON CONFLICT(product_handle) DO UPDATE SET insight_json = excluded.insight_json, expires_at = excluded.expires_at, created_at = datetime('now')",
    )
    .bind(&cache_key)
    .bind(&json_str)
    .bind(&expires_at)
    .execute(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(serde_json::json!({ "status": "cached" })))
}

// ── Cart Sessions ───────────────────────────────────────────────────────────

async fn get_cart_session(
    State(state): State<AppState>,
    Path(session_id): Path<String>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let row: Option<String> =
        sqlx::query_scalar("SELECT cart_id FROM cart_sessions WHERE session_id = ?")
            .bind(&session_id)
            .fetch_optional(&state.db)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    match row {
        Some(cart_id) => Ok(Json(serde_json::json!({ "cart_id": cart_id }))),
        None => Err(StatusCode::NOT_FOUND),
    }
}

#[derive(serde::Deserialize)]
struct SaveCartSessionRequest {
    cart_id: String,
}

async fn save_cart_session(
    State(state): State<AppState>,
    Path(session_id): Path<String>,
    Json(body): Json<SaveCartSessionRequest>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    sqlx::query(
        "INSERT INTO cart_sessions (session_id, cart_id) VALUES (?, ?)
         ON CONFLICT(session_id) DO UPDATE SET cart_id = excluded.cart_id, updated_at = datetime('now')",
    )
    .bind(&session_id)
    .bind(&body.cart_id)
    .execute(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(serde_json::json!({ "status": "saved" })))
}

// ── Wishlist ────────────────────────────────────────────────────────────────

type WishlistRow = (String, String, Option<String>, Option<String>, Option<String>, String);

async fn list_wishlist(
    State(state): State<AppState>,
    Path(session_id): Path<String>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let rows: Vec<WishlistRow> = sqlx::query_as(
            "SELECT id, product_handle, product_title, product_image, product_price, created_at
             FROM wishlist_items WHERE session_id = ? ORDER BY created_at DESC",
        )
        .bind(&session_id)
        .fetch_all(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let items: Vec<serde_json::Value> = rows
        .into_iter()
        .map(|(id, handle, title, image, price, created_at)| {
            serde_json::json!({
                "id": id,
                "product_handle": handle,
                "product_title": title,
                "product_image": image,
                "product_price": price,
                "created_at": created_at,
            })
        })
        .collect();

    Ok(Json(serde_json::json!({ "items": items })))
}

#[derive(serde::Deserialize)]
struct AddWishlistRequest {
    product_handle: String,
    product_title: Option<String>,
    product_image: Option<String>,
    product_price: Option<String>,
}

async fn add_wishlist(
    State(state): State<AppState>,
    Path(session_id): Path<String>,
    Json(body): Json<AddWishlistRequest>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let id = uuid::Uuid::new_v4().to_string();

    sqlx::query(
        "INSERT INTO wishlist_items (id, session_id, product_handle, product_title, product_image, product_price)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(session_id, product_handle) DO NOTHING",
    )
    .bind(&id)
    .bind(&session_id)
    .bind(&body.product_handle)
    .bind(&body.product_title)
    .bind(&body.product_image)
    .bind(&body.product_price)
    .execute(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(serde_json::json!({ "id": id, "status": "added" })))
}

async fn delete_wishlist(
    State(state): State<AppState>,
    Path((_session_id, id)): Path<(String, String)>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    sqlx::query("DELETE FROM wishlist_items WHERE id = ?")
        .bind(&id)
        .execute(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(serde_json::json!({ "status": "deleted" })))
}

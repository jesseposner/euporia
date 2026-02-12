use axum::{
    extract::{Path, State},
    http::StatusCode,
    routing::get,
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
        .route(
            "/api/profiles/{session_id}",
            get(get_profile).post(save_profile),
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

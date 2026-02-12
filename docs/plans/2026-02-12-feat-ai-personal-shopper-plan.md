---
title: "feat: AI Personal Shopper with Shopify Agent Toolkit"
type: feat
date: 2026-02-12
---

# AI Personal Shopper with Shopify Agent Toolkit

## Overview

Build a chat-based AI personal shopper that learns taste through conversation, searches across Shopify merchants via Catalog MCP, and completes real purchases with Shop Pay. Demo shows the full journey: onboarding → taste profile → product discovery → checkout.

**Brainstorm:** `docs/brainstorms/2026-02-12-ai-personal-shopper-brainstorm.md`

## Architecture

```
Browser
  └─ Next.js Chat UI (useChat hook)
       └─ Next.js API Route: /api/chat (streamText + tools)
            ├─ LLM (Claude via @ai-sdk/anthropic)
            ├─ Shopify Catalog MCP (JSON-RPC over HTTPS)
            │    └─ POST https://discover.shopifyapps.com/global/mcp
            ├─ Shopify Checkout MCP (JSON-RPC over HTTPS, per-shop)
            │    └─ POST https://{shop-domain}/api/ucp/mcp
            ├─ Checkout Kit (<shopify-checkout> web component, modal)
            └─ Rust/Axum Backend (localhost:3010)
                 └─ SQLite (taste_profiles table)
```

**Key design decisions:**
- Shopify JWT is managed in the Next.js API route (in-memory cache, lazy refresh on 401)
- Checkout Kit renders as a modal overlay triggered by a button in the chat
- Taste profile is a JSON blob (not structured schema) — the LLM extracts and stores free-form preferences
- Chat history is ephemeral (page refresh = restart). Acceptable for hackathon.
- Single product per checkout (no multi-item cart)
- Agent auto-selects first available variant; asks user only if multiple obvious options (size/color)

## Proposed Solution

### Phase 0: Prerequisites (Do Before Coding)

- [ ] Register on [Shopify Dev Dashboard](https://shopify.dev) → Catalogs → "Get an API key"
- [ ] Create a saved catalog, copy catalog ID
- [ ] Get client ID + client secret
- [ ] Test a single Catalog MCP search via curl to verify credentials:

```bash
# Get JWT
curl -X POST "https://api.shopify.com/auth/access_token" \
  -H "Content-Type: application/json" \
  -d '{"client_id":"YOUR_ID","client_secret":"YOUR_SECRET","grant_type":"client_credentials"}'

# Search products
curl -X POST "https://discover.shopifyapps.com/global/mcp" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT" \
  -d '{"jsonrpc":"2.0","method":"tools/call","id":1,"params":{"name":"search_global_products","arguments":{"saved_catalog":"YOUR_CATALOG_ID","query":"sneakers","limit":3}}}'
```

- [ ] Get an Anthropic API key (or OpenAI key — swap `@ai-sdk/anthropic` for `@ai-sdk/openai`)
- [ ] Update `.env.example` and create `.env` with all credentials

### Phase 1: Backend — Taste Profile Storage

**Files to create/modify:**

#### `backend/.env` / `.env.example`

Add Shopify + LLM credentials:

```env
DATABASE_URL=sqlite:euporia.db
SHOPIFY_CLIENT_ID=your_client_id
SHOPIFY_CLIENT_SECRET=your_client_secret
SHOPIFY_CATALOG_ID=your_catalog_id
ANTHROPIC_API_KEY=sk-ant-...
```

#### `backend/src/main.rs`

- Load `.env` via `dotenvy::dotenv().ok()`
- Create SQLite pool: `SqlitePool::connect(&env::var("DATABASE_URL")?).await?`
- Run migrations: `sqlx::migrate!().run(&pool).await?`
- Add pool to Axum state: `Router::new().with_state(pool)`
- Add routes: `POST /api/profiles`, `GET /api/profiles/:session_id`

#### `backend/migrations/001_taste_profiles.sql`

```sql
CREATE TABLE IF NOT EXISTS taste_profiles (
    session_id TEXT PRIMARY KEY,
    profile TEXT NOT NULL,  -- JSON blob
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

#### `backend/src/lib.rs`

Define types:

```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct TasteProfile {
    pub session_id: String,
    pub profile: String,  // JSON string from LLM
}
```

#### Backend API contract

```
POST /api/profiles
  Body: { "session_id": "abc-123", "profile": "{...json...}" }
  Response: { "session_id": "abc-123" }

GET /api/profiles/:session_id
  Response: { "session_id": "abc-123", "profile": "{...json...}" }
  404: { "error": "Profile not found", "code": "NOT_FOUND" }
```

### Phase 2: Frontend — AI SDK + Chat Scaffold

**Install dependencies:**

```bash
cd frontend && npm install ai @ai-sdk/react @ai-sdk/anthropic zod
```

**Files to create/modify:**

#### `frontend/app/api/chat/route.ts`

The agent brain. Key components:

- `streamText` with `stopWhen: stepCountIs(10)`
- `export const maxDuration = 60`
- System prompt defining the personal shopper persona and onboarding flow
- Shopify JWT management (in-memory cache with 50-min refresh)
- Tools (see tool definitions below)

#### Tool definitions

| Tool | Purpose | Inputs | Calls |
|------|---------|--------|-------|
| `searchProducts` | Search Catalog MCP | `query: string`, `minPrice?: number`, `maxPrice?: number` | Catalog MCP `search_global_products` |
| `getProductDetails` | Get full product info | `upid: string` | Catalog MCP `get_global_product_details` |
| `saveTasteProfile` | Persist taste to backend | `sessionId: string`, `profile: string` | `POST localhost:3010/api/profiles` |
| `loadTasteProfile` | Load taste on return visit | `sessionId: string` | `GET localhost:3010/api/profiles/:id` |
| `createCheckout` | Start checkout | `variantId: string`, `shopDomain: string` | Checkout MCP `create_checkout` |

#### `frontend/app/chat/page.tsx`

Chat page using `useChat`:

- `DefaultChatTransport` pointing to `/api/chat`
- Render `message.parts` with type switching:
  - `text` → markdown text
  - `tool-searchProducts` → product card grid
  - `tool-getProductDetails` → detailed product card
  - `tool-createCheckout` → checkout button (triggers Checkout Kit modal)
- Loading states for tool calls (`part.state === 'call'` → skeleton)
- Session ID from cookie (set on first visit, read on return)

#### `frontend/app/chat/layout.tsx`

Chat-specific layout (full height, no default page padding).

#### `frontend/components/product-card.tsx`

Rich product card with:
- Product image (live URL from Catalog MCP, with fallback)
- Title, price range, merchant name
- "View Details" and "Buy" action buttons
- Renders inside chat as a tool result

#### `frontend/components/checkout-modal.tsx`

Wrapper around `<shopify-checkout>` web component:
- Renders as a modal overlay
- `src` set to `checkoutUrl` from product data (Path A: direct checkoutUrl)
- Listens for `checkout:complete` event → shows confirmation in chat
- Listens for `checkout:close` event → dismisses modal

#### `frontend/components/chat-message.tsx`

Message renderer that handles all part types with appropriate UI for each.

### Phase 3: System Prompt Engineering

The system prompt is critical for the demo. It defines:

```
You are euporia, an AI personal shopper. You help people discover products
they'll love across thousands of Shopify merchants.

ONBOARDING (new users without a taste profile):
- Start by asking 3-4 questions about their style, favorite brands, budget range
- Be conversational and warm, not survey-like
- After gathering preferences, save their taste profile using saveTasteProfile

RETURNING USERS (taste profile exists):
- Greet them warmly, reference their known preferences
- Skip onboarding, go straight to helping them shop

PRODUCT SEARCH:
- Use the taste profile to inform your search queries
- Present 3-4 top results, explain why each matches their taste
- If no results, broaden the search or ask the user to relax constraints

CHECKOUT:
- When the user picks a product, confirm their choice before creating checkout
- If the product has variants (size, color), ask the user to choose
- Create checkout and present the payment button

RULES:
- Never auto-purchase without user confirmation
- Be concise — this is chat, not email
- If asked about something unrelated to shopping, gently redirect
```

### Phase 4: shadcn/ui Components

Install needed components:

```bash
cd frontend
npx shadcn@latest add button card input scroll-area avatar badge skeleton separator
```

### Phase 5: Wiring and Polish

- [ ] Update `frontend/app/page.tsx` to redirect to `/chat` or show a landing → chat CTA
- [ ] Add session cookie logic (generate UUID on first visit, store in cookie)
- [ ] Wire `loadTasteProfile` tool to check for existing profile on conversation start
- [ ] Add dark mode toggle (shadcn theme is already set up with light/dark)
- [ ] Mobile-responsive chat layout
- [ ] Error boundaries for failed tool calls

## Acceptance Criteria

- [ ] User can chat with the agent and complete taste onboarding
- [ ] Agent searches real Shopify products via Catalog MCP
- [ ] Product results render as rich cards with images and prices
- [ ] Agent remembers returning users via taste profile in SQLite
- [ ] User can initiate checkout for a selected product
- [ ] Checkout Kit modal opens for Shop Pay payment
- [ ] Order confirmation displays in chat after successful payment
- [ ] Session persists via cookie across page visits (not across cookie clear)

## Dependencies & Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Shopify Dev Dashboard has approval queue | Blocks everything | Register ASAP (Phase 0), test with curl before coding |
| Catalog MCP rate limits hit during dev | Slows iteration | Cache nothing, but be mindful of rapid polling |
| Checkout Kit web component doesn't embed cleanly in React | Breaks checkout flow | Fallback: open `checkoutUrl` in new tab instead of modal |
| JWT expires mid-conversation | API calls fail | Lazy refresh: catch 401, get new token, retry once |
| LLM hallucinates product info | Bad demo | Tools return real data, system prompt says "only present tool results" |
| Shop Pay popup blocked by browser | Can't complete payment | Test in Chrome (least restrictive), have a backup browser ready |

## Build Order (Hackathon Timeline)

```
1. Phase 0: Register Shopify + test curl         (15 min)
2. Phase 1: Rust backend taste profile API        (30 min)
3. Phase 4: Install shadcn components             (5 min)
4. Phase 2: Chat route + tools + chat page        (90 min)
5. Phase 3: System prompt tuning                  (30 min)
6. Phase 5: Polish, cookie logic, error states    (30 min)
7. Checkout Kit integration                       (30 min)
8. End-to-end testing + demo prep                 (30 min)
```

**Total estimated active build time: ~4 hours**

## Simplifications (Explicit YAGNI)

These are things we are deliberately NOT building:

- No user authentication (cookie-only identity)
- No chat history persistence (refresh = restart)
- No multi-item cart (one product per checkout)
- No taste profile editing UI (agent handles updates via conversation)
- No product variant picker UI (agent asks in chat, or auto-selects first)
- No provider-agnostic LLM abstraction (hardcode Anthropic/Claude)
- No structured taste profile schema validation (JSON blob is fine)
- No offline/error recovery beyond basic retry
- No analytics or logging beyond tracing

## References

- [Shopify Agentic Commerce](https://shopify.dev/docs/agents)
- [Catalog MCP Server](https://shopify.dev/docs/agents/catalog/catalog-mcp)
- [Checkout MCP Server](https://shopify.dev/docs/agents/checkout/mcp)
- [Checkout Kit for Web](https://shopify.dev/docs/storefronts/mobile/checkout-kit/web)
- [Shop Pay Handler](https://shopify.dev/docs/agents/checkout/shop-pay-handler)
- [Shopify Auth for Agents](https://shopify.dev/docs/agents/get-started/authentication)
- [AI SDK: streamText](https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text)
- [AI SDK: useChat](https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat)
- [AI SDK: Tool Calling](https://ai-sdk.dev/cookbook/next/call-tools-multiple-steps)
- Brainstorm: `docs/brainstorms/2026-02-12-ai-personal-shopper-brainstorm.md`

---
title: "feat: AI personal shopper chat"
type: feat
date: 2026-02-12
---

# feat: AI Personal Shopper Chat

## Overview

Build a chat-based AI personal shopper in the existing Next.js frontend using Vercel AI SDK and Shopify's Storefront MCP. The agent learns user taste through conversation, searches products across a Shopify store, and creates a cart with a checkout URL — all without authentication.

Hackathon scope: single-day build, demo the full journey (onboarding → search → cart → checkout URL).

## Proposed Solution

Next.js-only architecture. AI SDK's `streamText` with custom tools handles the agent loop in an API route. Tools make JSON-RPC calls to Shopify's Storefront MCP (`https://{store}/api/mcp`). `useChat` on the client streams responses and renders rich product cards from tool results.

Rust/Axum backend with SQLite stores taste profiles so the agent remembers returning users. No user auth — profiles keyed by a simple session ID.

## Technical Approach

### Architecture

```
Browser
  └─ Chat Page (useChat hook)
       └─ POST /api/chat (streamText + tools)
            ├─ LLM (provider-agnostic via AI SDK)
            ├─ Shopify Storefront MCP (JSON-RPC 2.0, no auth)
            │    ├─ search_shop_catalog
            │    ├─ get_product_details
            │    ├─ update_cart
            │    └─ get_cart
            └─ Rust/Axum Backend (localhost:3010)
                 └─ SQLite (taste profiles)
                      ├─ GET  /api/profiles/:session_id
                      └─ POST /api/profiles/:session_id
```

### Files to Create/Modify

```
frontend/
├── app/
│   ├── page.tsx                      # MODIFY — replace placeholder with chat UI
│   ├── api/
│   │   └── chat/
│   │       └── route.ts              # CREATE — AI SDK streamText + Shopify tools
│   └── globals.css                   # MODIFY — chat layout styles if needed
├── components/
│   ├── chat.tsx                      # CREATE — main chat component (useChat)
│   ├── product-card.tsx              # CREATE — product display card
│   └── cart-summary.tsx              # CREATE — cart + checkout URL display
├── lib/
│   ├── shopify-mcp.ts               # CREATE — Storefront MCP client (JSON-RPC)
│   └── utils.ts                     # EXISTS — cn() helper
├── .env.local                        # CREATE — LLM API key, store domain, backend URL
└── package.json                      # MODIFY — add ai, @ai-sdk/*, zod

backend/
├── src/
│   └── main.rs                      # MODIFY — add profile routes + DB setup
├── migrations/
│   └── 001_create_profiles.sql      # CREATE — taste_profiles table
└── euporia.db                        # SQLite database (auto-created)
```

### Implementation Phases

#### Phase 1: Foundation (Install + Wire Up)

1. Install dependencies:
   ```bash
   cd frontend && npm install ai @ai-sdk/anthropic zod
   ```
   Use `@ai-sdk/anthropic` as default provider (swap later if needed).

2. Create `lib/shopify-mcp.ts` — thin JSON-RPC 2.0 client:
   ```typescript
   export async function callMCP(store: string, method: string, args: Record<string, unknown>) {
     const res = await fetch(`https://${store}/api/mcp`, {
       method: 'POST',
       headers: { 'content-type': 'application/json' },
       body: JSON.stringify({
         jsonrpc: '2.0',
         id: Date.now(),
         method: 'tools/call',
         params: { name: method, arguments: args },
       }),
     });
     const json = await res.json();
     if (json.error) throw new Error(json.error.message ?? 'MCP error');
     // Storefront MCP returns result.content[0].text as JSON string
     return JSON.parse(json.result.content[0].text);
   }
   ```

3. Create `.env.local`:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   SHOPIFY_STORE=store.bitcoinmagazine.com
   BACKEND_URL=http://localhost:3010
   ```

4. Smoke test: call `callMCP(store, 'search_shop_catalog', { query: 'hat', context: 'test' })` from a temporary API route to confirm it works in Next.js server context.

#### Phase 1b: Rust Backend — Taste Profile Storage

1. Create SQLite migration `backend/migrations/001_create_profiles.sql`:
   ```sql
   CREATE TABLE IF NOT EXISTS taste_profiles (
     session_id TEXT PRIMARY KEY,
     profile_json TEXT NOT NULL,  -- JSON blob: brands, styles, budget, preferences
     created_at TEXT NOT NULL DEFAULT (datetime('now')),
     updated_at TEXT NOT NULL DEFAULT (datetime('now'))
   );
   ```

2. Add two routes to `backend/src/main.rs`:

   **`GET /api/profiles/:session_id`** — Returns the stored taste profile (or 404).

   **`POST /api/profiles/:session_id`** — Upserts a taste profile. Body: `{ "profile": { ... } }`.

   Profile JSON is unstructured — the LLM extracts whatever it thinks is relevant (brands, style keywords, budget range, preferred colors, etc.) and saves it as a JSON blob.

3. Run migrations on startup with `sqlx::migrate!()`.

4. Shared state: `Arc<SqlitePool>` passed via Axum `State`.

#### Phase 2: Agent API Route

Create `app/api/chat/route.ts` with AI SDK `streamText` and 4 Shopify tools:

**Tools:**

| Tool | Backend | Purpose |
|------|---------|---------|
| `searchProducts` | Shopify MCP `search_shop_catalog` | Search by natural language query + context |
| `getProductDetails` | Shopify MCP `get_product_details` | Get variant ID for a selected product + options |
| `addToCart` | Shopify MCP `update_cart` | Create or add items to cart |
| `getCart` | Shopify MCP `get_cart` | Retrieve current cart state |
| `loadTasteProfile` | Rust `GET /api/profiles/:id` | Load saved taste profile at start of session |
| `saveTasteProfile` | Rust `POST /api/profiles/:id` | Save/update taste profile after onboarding |

**System prompt** (key instructions for the agent):
- You are a personal shopper. On first message, call `loadTasteProfile` to check for a returning user.
- If a profile exists, greet them by acknowledging their preferences and ask what they're looking for today.
- If no profile, start by learning their taste (brands, style, budget, occasion).
- After learning enough about the user's taste, call `saveTasteProfile` with a JSON summary of their preferences.
- When searching, pass the user's taste as the `context` parameter.
- Present products with numbered list: [1], [2], [3] so user can pick by number.
- Always show: product title, price, available sizes/colors, image.
- When user picks a product, confirm size/color, then add to cart.
- After adding to cart, show checkout URL as a clickable link.
- If search returns no results, suggest broader terms.
- Never make up product details — only cite what MCP returns.
- User can add multiple items before checking out.

**Config:**
- `stopWhen: stepCountIs(5)` — allow multi-step tool calls (search → details → cart)
- Response streaming via `toUIMessageStreamResponse()`

#### Phase 3: Chat UI

Design based on "Conversational Concierge" mockup, adapted for React/shadcn/Lucide.

1. Install shadcn components:
   ```bash
   npx shadcn@latest add card button input avatar scroll-area
   ```

2. **Layout** — Full-height flex layout:
   - Left sidebar (280px): "Shopping Missions" history list, new mission button, user profile stub. Skip for MVP — can be empty placeholder.
   - Main area: header bar ("Concierge AI Active" indicator), scrollable chat stream, sticky input bar at bottom with gradient fade.

3. **Chat component** (`components/chat.tsx`) — client component with `useChat`:
   - Message list in scroll area, auto-scroll on new messages
   - User messages: right-aligned, primary color background, rounded bubbles
   - Agent messages: left-aligned with AI avatar icon, white/surface background
   - Input bar: textarea with send button, fixed to bottom with gradient overlay

4. **Product cards** (`components/product-card.tsx`) — rendered inline in chat:
   - Grid layout (1-3 columns depending on result count)
   - Each card: product image, title, price, description snippet (2 lines), available options as small badges
   - Hover: slight lift + border highlight
   - Fallback for broken images

5. **Quick action chips** — rendered after product results:
   - "Show cheaper options", "Different style", "Add to cart" etc.
   - Clicking sends that text as a user message

6. **Cart summary** (`components/cart-summary.tsx`):
   - Line items with quantities and prices
   - Total
   - Checkout button → opens `checkout_url` in new tab

7. **Tool part rendering in chat:**
   - `tool-searchProducts` → grid of `<ProductCard>` components
   - `tool-getProductDetails` → single detailed `<ProductCard>`
   - `tool-addToCart` / `tool-getCart` → `<CartSummary>` component
   - Loading states: "Searching products...", "Adding to cart..."
   - Error states: friendly message, not raw error

8. **Icons:** Lucide only (no Material Icons). Use `lucide-react` already installed.

9. Update `app/page.tsx` to render the chat component full-page.

#### Phase 4: Polish for Demo

- Pre-test the full flow: taste Q&A → search → pick → cart → checkout URL
- Prepare a demo script (copy-paste conversation starters)
- Test on mobile (checkout URL opens correctly)
- Add a header/branding to the chat page
- Verify Shopify store is accessible

## Acceptance Criteria

- [ ] User can chat with the agent in the browser
- [ ] Agent asks taste-discovery questions on first message
- [ ] Agent searches Shopify products via Storefront MCP based on user preferences
- [ ] Products display with images, titles, prices, and variant options
- [ ] User can select a product and variant (size/color) through chat
- [ ] Agent creates a cart and presents a working Shopify checkout URL
- [ ] User can add multiple items to cart before checking out
- [ ] Empty search results handled gracefully (agent suggests alternatives)
- [ ] MCP errors show friendly messages, not raw errors
- [ ] Streaming responses — text appears incrementally, not all at once
- [ ] Taste profile saved to SQLite after onboarding conversation
- [ ] Returning user's taste profile loaded and acknowledged by agent

## Edge Cases to Handle

| Scenario | Agent Behavior |
|----------|---------------|
| Empty search results | "No products found for that. Try broader terms like '___'?" |
| Out-of-stock variant | Show only in-stock variants from `availabilityMatrix` |
| Ambiguous selection ("the blue one") | Number products [1]-[N], ask user to pick by number |
| MCP timeout/error | "Having trouble reaching the store. Let me try again." (single retry) |
| User skips taste Q&A ("show me hoodies") | Search immediately, skip onboarding |
| User wants to start over | Agent resets context, asks new taste questions |
| Invalid variant combo | "That size/color isn't available. Here's what we have: ___" |

## Dependencies

- `ai` (Vercel AI SDK)
- `@ai-sdk/anthropic` (or `@ai-sdk/openai` — swappable)
- `zod` (tool input schemas)
- shadcn components: card, button, input, avatar, scroll-area
- Shopify Storefront MCP at `store.bitcoinmagazine.com` (verified working 2026-02-12)

## Risks

| Risk | Mitigation |
|------|-----------|
| Shopify store goes down during demo | Pre-record a backup video of the flow |
| MCP rate limits | Keep demo searches modest, don't spam |
| LLM API key runs out of credits | Have a second provider key ready |
| AI SDK API changes | Pin exact versions in package.json |

## References

- Brainstorm: `docs/brainstorms/2026-02-12-ai-personal-shopper-brainstorm.md`
- shadcn chat example: `.references/ui/apps/v4/components/cards/chat.tsx`
- [AI SDK docs — streamText](https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text)
- [AI SDK docs — useChat](https://ai-sdk.dev/docs/reference/ai-sdk-react/use-chat)
- [AI SDK — tool calling](https://ai-sdk.dev/cookbook/next/call-tools)
- [AI SDK — multi-step tools](https://ai-sdk.dev/cookbook/next/call-tools-multiple-steps)
- [Shopify Storefront MCP](https://shopify.dev/docs/apps/build/storefront-mcp)
- Verified MCP endpoint: `POST https://store.bitcoinmagazine.com/api/mcp`

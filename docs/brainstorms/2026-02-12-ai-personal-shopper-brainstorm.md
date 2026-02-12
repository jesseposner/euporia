# AI Personal Shopper — Brainstorm

**Date:** 2026-02-12
**Context:** Presidio Bitcoin Builders Day hackathon

## What We're Building

A chat-based AI personal shopper that:

1. **Learns your taste** through conversational onboarding ("What brands do you like?", "What's your style?", preference questions)
2. **Searches Shopify stores** via Storefront MCP (no auth required) to find products matching your taste profile
3. **Handles checkout** by building a cart and giving the user a Shopify checkout URL to complete payment
4. Works across **any product category** — not constrained to fashion, home, etc.

The demo shows the full journey: onboarding chat → taste profile → product discovery → cart → checkout.

## Why This Approach

- **Storefront MCP** works today with zero authentication — just `https://{store}/api/mcp`. Verified working against `store.bitcoinmagazine.com`.
- **Full cart + checkout flow** via MCP: `search_shop_catalog` → `get_product_details` → `update_cart` (creates cart) → checkout URL. All confirmed working.
- **Conversational onboarding** is the simplest taste-learning approach — no integrations needed, just good prompting
- **Category-agnostic** keeps the demo flexible

## Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| API | Storefront MCP (no auth) | Catalog MCP requires Dev Dashboard org access (JWT). Storefront MCP works immediately with any Shopify store. |
| Scope | Per-store (can hit multiple stores) | Storefront MCP is scoped to a single store domain. Agent can target multiple stores by domain. |
| Payment | Checkout URL handoff | Cart creation returns a real `checkout_url`. User clicks to complete payment on Shopify. No Shop Pay embed or Checkout Kit needed. |
| Taste input | Conversational onboarding | Fastest to build, no external integrations, plays well in a demo |
| Product category | Category-agnostic | Flexible for demo, lets the agent show range |
| AI backend | Vercel AI SDK in Next.js | Agent loop runs in API routes (streamText + tools). Single stack, built-in streaming to chat UI. |
| Frontend | Next.js + chat UI | Already scaffolded, AI SDK's useChat provides the client-side streaming |
| Backend | Rust/Axum + SQLite | Stores taste profiles so the agent remembers returning users. Existing scaffolding (Axum, sqlx, SQLite) already in place. |
| Persistence | Taste profiles in SQLite | Agent extracts a taste profile from onboarding conversation, Rust backend stores it. On return visits, profile is loaded into the LLM context. |
| Bitcoin | Stretch goal only | Focus on shopping agent first; BDK/Bitcoin payment is a bonus if time permits |

## Architecture

```
User (browser)
  └─ Next.js Chat UI (useChat hook)
       └─ Next.js API Route (streamText + tools)
            ├─ LLM API (Claude, GPT, etc. — provider-agnostic)
            └─ Shopify Storefront MCP (per-store, no auth)
                 ├─ search_shop_catalog
                 ├─ get_product_details
                 ├─ update_cart (create/modify cart)
                 ├─ get_cart
                 └─ search_shop_policies_and_faqs
```

## Storefront MCP — Verified Working

Tested against `store.bitcoinmagazine.com` on 2026-02-12. Full flow confirmed:

| Tool | Input | Output |
|---|---|---|
| `search_shop_catalog` | `query: "t-shirt", context: "bitcoin-themed, under $50"` | Products with IDs, titles, descriptions, image URLs, prices, variants, availability matrix |
| `get_product_details` | `product_id, options: {Color, Size}` | Selected variant with `variant_id`, price, image, availability |
| `update_cart` | `add_items: [{product_variant_id, quantity}]` | Cart with `checkout_url`, line items, costs |

Endpoint: `POST https://{store}/api/mcp` with `Content-Type: application/json`, JSON-RPC 2.0.

## User Flow

1. User opens chat UI
2. Agent greets and asks taste-discovery questions (brands, style, budget, etc.)
3. Agent builds a taste profile from the conversation (just LLM context — no structured storage, no database)
4. User says something like "Find me a great jacket" or "I need a gift for my partner"
5. Agent calls `search_shop_catalog` with taste-informed query + context
6. Agent presents product results with images, prices, variants in the chat
7. User picks a product and options (size, color, etc.)
8. Agent calls `get_product_details` to get the variant ID
9. Agent calls `update_cart` to create a cart with the selected variant
10. Agent presents the checkout URL — user clicks to complete payment on Shopify

## Resolved Questions

1. **Auth:** Storefront MCP requires no authentication. Just hit `https://{store}/api/mcp`.
2. **Product images:** Yes — returns image URLs, alt text, multiple images per product.
3. **Cart + checkout:** `update_cart` creates a cart and returns a real Shopify `checkout_url`. No Checkout Kit or Shop Pay embed needed.
4. **Available tools:** Use `tools/list` to discover all tools per store. Confirmed: `search_shop_catalog`, `get_product_details`, `update_cart`, `get_cart`, `search_shop_policies_and_faqs`.

## Prereqs (Do First at Hackathon)

1. **Pick target store(s)** — verify Storefront MCP is accessible (`curl` the `tools/list` endpoint). Some stores may restrict access.
2. **Get an LLM API key** — whichever provider you want to use with AI SDK.

## Open Questions

1. **Multi-store UX:** Can the agent search multiple stores in parallel, or should the user pick a store first? For the hackathon, starting with one store is simpler.
2. **Rate limits:** Not documented for Storefront MCP. Should be fine for a demo.

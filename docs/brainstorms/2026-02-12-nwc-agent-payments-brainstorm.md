# NWC Agent Payments — Brainstorm

**Date:** 2026-02-12
**Status:** Brainstorm
**Author:** Jesse + Claude

## What We're Building

An autonomous Bitcoin payment flow for the ShopAI agent. The agent completes
real purchases end-to-end: browses products via Shopify MCP, drives a headless
browser through checkout via Kernel, and pays the resulting Lightning invoice
via Nostr Wallet Connect (NWC) — all without human intervention during the
purchase.

### The Full Loop

```
User: "Buy me that orange hoodie"
  |
  v
1. Agent searches catalog (Shopify MCP — already works)
2. Agent adds to cart, gets checkout URL (Shopify MCP — already works)
3. Agent opens checkout in Kernel browser session
4. Agent fills shipping info, selects "Pay with Bitcoin"
5. BTCPay Server generates a Lightning invoice
6. Agent extracts BOLT11 invoice from the BTCPay page
7. Agent pays invoice via NWC (from pre-funded demo wallet)
8. BTCPay confirms payment, Shopify marks order as paid
9. Agent reports success to user with order confirmation
```

## Why This Approach

### NWC over alternatives

- **vs. Cashu ecash:** NWC is more mature, user keeps custody, built-in budget
  controls at the wallet level. Cashu adds custodial risk (mints) and
  alpha-stage libraries. Cool tech but more moving parts for a hackathon.
- **vs. Bitrefill gift card bridge:** Bitcoin Magazine store already accepts BTC
  via BTCPay — no need to convert to fiat gift cards. Bitrefill adds a
  middleman, requires partner API access, and needs browser automation for the
  card entry step anyway.
- **vs. on-chain BDK:** Lightning is instant settlement, critical for demo UX.
  On-chain requires block confirmations. BDK deps are already in Cargo.toml
  but Lightning via NWC is a better fit for agent commerce.

### Kernel for checkout

The Shopify MCP handles product discovery and cart management but doesn't
expose the payment step. The checkout flow requires navigating a web page,
selecting a payment method, and interacting with BTCPay's invoice page. Kernel
provides headless browser infrastructure purpose-built for AI agents — fast
spin-up, anti-bot detection, Playwright API, session recording.

### NWC placement

NWC client lives in the **Next.js API routes** (using `@getalby/sdk`), colocated
with the existing agent logic. The agent already runs tool calls via Vercel AI
SDK in the chat route — adding a `payLightningInvoice` tool keeps everything
in one place. The Rust backend stays as persistence only.

## Key Decisions

1. **NWC as the payment protocol** — agent is an authorized spender on the
   user's Lightning wallet, with budget limits enforced by the wallet.

2. **Kernel for checkout automation** — headless browser navigates Shopify
   checkout and BTCPay invoice page to extract the BOLT11 invoice.

3. **NWC client in Next.js** — `@getalby/sdk` in the API route, not the Rust
   backend. Keeps payment logic with the agent.

4. **Pre-funded demo wallet** — for the hackathon demo, provide a pre-configured
   NWC connection string from a funded Lightning wallet. No user setup friction.

5. **Bitcoin Magazine store as demo merchant** — already connected via Shopify
   MCP, already accepts BTC via BTCPay Server. Real end-to-end purchase.

## Architecture

```
┌─────────────────────────────────────────────────┐
│  Next.js Frontend (port 3011)                   │
│                                                 │
│  /api/chat (Vercel AI SDK agent)                │
│    Tools:                                       │
│    - searchProducts     (Shopify MCP)           │
│    - getProductDetails  (Shopify MCP)           │
│    - addToCart           (Shopify MCP)           │
│    - getCart             (Shopify MCP)           │
│    - checkoutAndPay     (NEW — Kernel + NWC)    │
│    - getWalletBalance   (NEW — NWC)             │
│    - loadTasteProfile   (Rust backend)          │
│    - saveTasteProfile   (Rust backend)          │
│                                                 │
│  /lib/nwc.ts            (NWC client wrapper)    │
│  /lib/kernel.ts         (Kernel browser client) │
└───────────┬─────────────┬───────────────────────┘
            │             │
   ┌────────▼──┐   ┌──────▼──────┐
   │  Kernel   │   │  NWC Relay  │
   │  (browser │   │  (Nostr)    │
   │  session) │   │             │
   └────┬──────┘   └──────┬──────┘
        │                 │
   ┌────▼──────┐   ┌──────▼──────┐
   │  Shopify  │   │  Lightning  │
   │  Checkout │   │  Wallet     │
   │  + BTCPay │   │  (Alby Hub) │
   └───────────┘   └─────────────┘
```

## New Agent Tools

### `checkoutAndPay`

The crown jewel. Given a checkout URL from the cart:

1. Launches a Kernel browser session
2. Navigates to Shopify checkout URL
3. Fills shipping information (from `DEMO_SHIPPING_ADDRESS` env var)
4. Selects "Pay with Bitcoin" payment method
5. Waits for BTCPay invoice page to load
6. Extracts BOLT11 Lightning invoice
7. Pays invoice via NWC (`nwcClient.payInvoice()`)
8. Waits for payment confirmation
9. Returns order confirmation details

### `getWalletBalance`

Simple NWC balance check. Shows the user how much spending power the agent has.
Useful for the agent to verify it can afford a purchase before attempting checkout.

## Dependencies

### JavaScript/TypeScript
- `@getalby/sdk` — NWC client (pay invoices, check balance)
- Kernel SDK — browser session management + Playwright execution
- `bolt11` or similar — BOLT11 invoice parsing (to verify amount before paying)

### Environment Variables
- `NWC_CONNECTION_URL` — nostr+walletconnect:// connection string
- `KERNEL_API_KEY` — Kernel browser infrastructure API key
- `DEMO_SHIPPING_ADDRESS` — pre-configured shipping for demo

## Demo Script

1. Open ShopAI dashboard
2. Chat: "Find me a cool Bitcoin hoodie under $60"
3. Agent searches, presents options
4. "Buy the orange one, size L"
5. Agent adds to cart, initiates checkout
6. UI shows: "Checking out via Bitcoin..."
   - Agent drives Kernel browser through checkout
   - Agent extracts Lightning invoice (show invoice amount in UI?)
   - Agent pays via NWC
7. UI shows: "Paid 150,000 sats! Order confirmed. Tracking: #12345"
8. Real order placed on Bitcoin Magazine store

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| BTCPay page structure changes | Kernel agent uses AI to navigate, not brittle selectors |
| BTCPay invoice not extractable from DOM | BTCPay v2 checkout shows BOLT11 as copyable text; verify during implementation. Fallback: use BTCPay Greenfield API directly if store exposes it |
| Lightning invoice expires (15 min typical) | Agent acts quickly; retry if expired |
| Insufficient wallet balance | Check balance before checkout; inform user |
| Shopify checkout requires CAPTCHA | Kernel has anti-bot detection; may need fallback |
| NWC relay downtime | Use multiple relays; Alby's relay is reliable |
| Demo wallet runs out of funds | Pre-fund with enough sats for several demos |

## Open Questions

_None — all questions resolved during brainstorming._

## Resolved Questions

1. **Who pays?** — Agent pays autonomously on behalf of user.
2. **Merchant side?** — Bitcoin Magazine store already accepts BTC via BTCPay.
   No gift card bridge needed.
3. **Demo fidelity?** — Real purchase end-to-end. Real sats, real order.
4. **NWC vs Cashu vs Bitrefill?** — NWC. Most mature, user keeps custody,
   budget controls built in.
5. **Where does NWC client live?** — Next.js API routes, with the agent.
6. **How to get the Lightning invoice?** — Kernel browser automation navigates
   checkout and extracts from BTCPay page.
7. **Wallet for demo?** — Pre-funded demo wallet, NWC connection string in env.

---
title: "feat: NWC agent Bitcoin payments via Kernel checkout"
type: feat
date: 2026-02-12
brainstorm: docs/brainstorms/2026-02-12-nwc-agent-payments-brainstorm.md
---

# feat: NWC Agent Bitcoin Payments via Kernel Checkout

## Overview

Add autonomous Bitcoin Lightning payment to the ShopAI agent. The agent
completes real purchases end-to-end: browses via Shopify MCP (already works),
drives a Kernel headless browser through Shopify checkout, and pays the
resulting BTCPay Lightning invoice via Nostr Wallet Connect (NWC).

Bitcoin Magazine's store already accepts BTC via BTCPay Server, so this
requires no merchant-side changes.

## Problem Statement

Today, ShopAI's checkout flow is a dead end — the agent hands the user a
Shopify checkout URL and says "complete your purchase here." The user leaves
the chat, opens a browser, and finishes manually. For a Bitcoin hackathon
demo, we need the agent to close the loop: find the product, add to cart,
pay with Lightning, and confirm the order — all within the chat.

## Proposed Solution

Three new pieces wired into the existing agent tool loop:

1. **`@getalby/sdk` NWC client** (`lib/nwc.ts`) — pays Lightning invoices
   from a pre-funded wallet via Nostr Wallet Connect
2. **`@onkernel/sdk` browser client** (`lib/kernel.ts`) — launches headless
   browser sessions and executes Playwright code to navigate Shopify checkout
3. **Two new agent tools** in `/api/chat/route.ts`:
   - `checkoutAndPay` — the full checkout + payment flow
   - `getWalletBalance` — NWC balance check

```
┌─────────────────────────────────────────────────┐
│  /api/chat (Vercel AI SDK agent)                │
│    existing: searchProducts, addToCart, getCart  │
│    NEW: checkoutAndPay, getWalletBalance         │
│                                                 │
│  /lib/nwc.ts     → @getalby/sdk NWCClient       │
│  /lib/kernel.ts  → @onkernel/sdk browser mgmt   │
└────────┬────────────────┬───────────────────────┘
         │                │
    Kernel browser    NWC relay
    (checkout nav)    (Nostr)
         │                │
    BTCPay Server    Lightning wallet
    (invoice gen)    (Alby Hub)
```

## Technical Considerations

### Node.js runtime required

The NWC SDK requires `websocket-polyfill` which only works in Node.js, not
Edge runtime. The chat route must use Node.js runtime (Next.js default for
API routes). Do NOT add `export const runtime = "edge"`.

### Timeout architecture

The `checkoutAndPay` tool takes 30-60 seconds (browser launch + page nav +
payment). The current `maxDuration` is 60s. For the hackathon (self-hosted
dev server, not Vercel serverless), bump to 180s. This is the simplest fix.

### Payment safety

Real sats are at stake. Before calling `nwcClient.payInvoice()`, log the
BOLT11 invoice and decoded amount to server stdout. After success, log the
preimage. This is the only safety net for "payment sent but confirmation
lost" scenarios.

### Agent step count

Current `stopWhen: stepCountIs(5)` is too low. A full purchase flow needs:
loadTasteProfile → searchProducts → getProductDetails → addToCart →
getWalletBalance → checkoutAndPay = 6 steps minimum. Increase to 10.

### NWC client lifecycle

Lazy singleton initialized on first use. The `@getalby/sdk` NWCClient
maintains a WebSocket connection to Nostr relays — creating one per request
adds 1-3s latency. Cache at module level, clean up on process exit.

### Kernel browser cleanup

Always call `kernel.browsers.deleteByID()` in a `finally` block. Orphaned
sessions cost money on Kernel's free tier ($5/mo budget).

### BOLT11 invoice extraction

Search the BTCPay page DOM for text matching the `lnbc` prefix pattern.
BTCPay v2 checkout typically shows the invoice as copyable text. Fallback:
use `page._snapshotForAI()` and let the Playwright code search the full
page content. The Playwright code runs in Kernel's VM so no local Playwright
dependency is needed.

### Cart state after payment

`checkoutAndPay` returns a `cartCompleted: true` flag. The chat component
or CartProvider should clear localStorage when it sees this. Prevents the
UI from showing a stale cart with a dead checkout link.

## Implementation Phases

### Phase 1: NWC client (`lib/nwc.ts`)

Create `frontend/lib/nwc.ts` — a thin wrapper around `@getalby/sdk` NWCClient.

```typescript
// frontend/lib/nwc.ts
import "websocket-polyfill";
import { NWCClient } from "@getalby/sdk/nwc";

let client: NWCClient | null = null;

export function getNWCClient(): NWCClient {
  if (!client) {
    const url = process.env.NWC_CONNECTION_URL;
    if (!url) throw new Error("NWC_CONNECTION_URL not set");
    client = new NWCClient({ nostrWalletConnectUrl: url });
  }
  return client;
}

export async function getBalance(): Promise<{ sats: number }> {
  const { balance } = await getNWCClient().getBalance();
  return { sats: Math.floor(balance / 1000) }; // msats → sats
}

export async function payInvoice(invoice: string): Promise<{
  preimage: string;
  feesSats: number;
}> {
  const result = await getNWCClient().payInvoice({ invoice });
  return {
    preimage: result.preimage,
    feesSats: Math.floor(result.fees_paid / 1000),
  };
}
```

**Files:**
- Create `frontend/lib/nwc.ts`

**Deps:** `npm install @getalby/sdk websocket-polyfill@0.0.3`

---

### Phase 2: Kernel browser client (`lib/kernel.ts`)

Create `frontend/lib/kernel.ts` — wraps `@onkernel/sdk` for checkout
navigation. Uses the Playwright Execution API (code runs in Kernel's VM,
no local Playwright needed).

```typescript
// frontend/lib/kernel.ts
import Kernel from "@onkernel/sdk";

const kernel = new Kernel({ apiKey: process.env.KERNEL_API_KEY! });

export async function withBrowser<T>(
  fn: (sessionId: string, liveViewUrl: string) => Promise<T>,
): Promise<T> {
  const session = await kernel.browsers.create({
    stealth: true,
    headless: true,
    timeout_seconds: 180,
  });
  try {
    return await fn(session.session_id, session.browser_live_view_url);
  } finally {
    await kernel.browsers.deleteByID(session.session_id).catch(() => {});
  }
}

export async function execPlaywright(
  sessionId: string,
  code: string,
): Promise<{ success: boolean; result: unknown; error?: string }> {
  return kernel.browsers.playwright.execute(sessionId, {
    code,
    timeout_sec: 30,
  });
}
```

**Files:**
- Create `frontend/lib/kernel.ts`

**Deps:** `npm install @onkernel/sdk`

---

### Phase 3: BOLT11 invoice parser (`lib/bolt11.ts`)

Create `frontend/lib/bolt11.ts` — thin wrapper around `light-bolt11-decoder`
for invoice verification before payment.

```typescript
// frontend/lib/bolt11.ts
import { decode } from "light-bolt11-decoder";

export interface ParsedInvoice {
  paymentRequest: string;
  amountSats: number | null;
  amountMsats: bigint | null;
  description: string | null;
  expiresAt: number;
  isExpired: boolean;
}

export function parseInvoice(bolt11: string): ParsedInvoice {
  const decoded = decode(bolt11);
  const now = Math.floor(Date.now() / 1000);
  const amountSection = decoded.sections.find((s) => s.name === "amount");
  const amountMsats =
    amountSection && "value" in amountSection
      ? BigInt(amountSection.value)
      : null;
  const descSection = decoded.sections.find((s) => s.name === "description");

  return {
    paymentRequest: decoded.paymentRequest,
    amountSats: amountMsats !== null ? Number(amountMsats / 1000n) : null,
    amountMsats,
    description:
      descSection && "value" in descSection ? descSection.value : null,
    expiresAt: decoded.expiry,
    isExpired: now > decoded.expiry,
  };
}
```

**Files:**
- Create `frontend/lib/bolt11.ts`

**Deps:** `npm install light-bolt11-decoder`

---

### Phase 4: Agent tools in chat route

Add `checkoutAndPay` and `getWalletBalance` tools to
`frontend/app/api/chat/route.ts`. Follow the existing `tool({...})` pattern.

#### `getWalletBalance` tool

```typescript
getWalletBalance: tool({
  description: "Check the Lightning wallet balance available for purchases",
  inputSchema: z.object({}),
  execute: async () => {
    const { sats } = await getBalance();
    return { balanceSats: sats };
  },
}),
```

#### `checkoutAndPay` tool

```typescript
checkoutAndPay: tool({
  description:
    "Complete Shopify checkout and pay with Bitcoin Lightning. " +
    "Takes a checkout URL from the cart and handles the entire " +
    "purchase flow: navigate checkout, fill shipping, select " +
    "Bitcoin payment, extract Lightning invoice, and pay via NWC.",
  inputSchema: z.object({
    checkoutUrl: z.string().describe("Shopify checkout URL from the cart"),
  }),
  execute: async ({ checkoutUrl }) => {
    // Parse shipping address from env
    const shipping = JSON.parse(process.env.DEMO_SHIPPING_ADDRESS || "{}");

    // IMPORTANT: Serialize values safely for injection into Playwright
    // code strings. Never interpolate raw user input into template literals.
    const safeUrl = JSON.stringify(checkoutUrl);
    const safeShipping = JSON.stringify(shipping);

    return withBrowser(async (sessionId, liveViewUrl) => {
      // 1. Navigate to checkout
      await execPlaywright(sessionId, `
        await page.goto(${safeUrl}, { waitUntil: "domcontentloaded" });
      `);

      // 2. Fill shipping form
      await execPlaywright(sessionId, `
        const s = ${safeShipping};
        // Selectors depend on Shopify checkout version — discover via
        // manual inspection of store.bitcoinmagazine.com checkout page.
        // These are illustrative; update with real selectors.
        await page.fill('[name="email"]', s.email);
        await page.fill('[name="firstName"]', s.firstName);
        await page.fill('[name="lastName"]', s.lastName);
        await page.fill('[name="address1"]', s.address1);
        await page.fill('[name="city"]', s.city);
        await page.fill('[name="postalCode"]', s.zip);
        // Select country and state via dropdowns
        // Submit shipping step
      `);

      // 3. Select Bitcoin payment method
      // This step depends on the store's checkout config.
      // Use page._snapshotForAI() to find the right element.

      // 4. Wait for BTCPay invoice page and extract BOLT11
      const extractResult = await execPlaywright(sessionId, `
        await page.waitForSelector('text=lnbc', { timeout: 15000 })
          .catch(() => null);
        const bodyText = await page.innerText('body');
        const match = bodyText.match(/lnbc[a-z0-9]+/i);
        return match ? match[0] : null;
      `);

      const bolt11 = extractResult.result as string | null;
      if (!bolt11) {
        return { error: "Could not extract Lightning invoice from checkout" };
      }

      // 5. Parse and verify invoice
      const invoice = parseInvoice(bolt11);
      if (invoice.isExpired) {
        return { error: "Lightning invoice expired" };
      }

      // 6. Pay via NWC
      console.log(`[NWC] Paying invoice: ${invoice.amountSats} sats`);
      const payment = await payInvoice(bolt11);
      console.log(`[NWC] Paid! Preimage: ${payment.preimage}`);

      // 7. Wait briefly for confirmation
      await new Promise((resolve) => setTimeout(resolve, 3000));

      return {
        success: true,
        amountSats: invoice.amountSats,
        feesSats: payment.feesSats,
        preimage: payment.preimage,
        liveViewUrl,
        cartCompleted: true,
      };
    });
  },
}),
```

**Note:** The Playwright selectors above are pseudocode. The actual selectors
will need to be discovered by manually inspecting the Bitcoin Magazine store's
checkout page, or by using `page._snapshotForAI()` and having the Playwright
code adapt. For the hackathon, hardcoding selectors after manual inspection
is the fastest path.

**Changes to existing code:**

- `frontend/app/api/chat/route.ts`:
  - Add imports for `getBalance`, `payInvoice` from `@/lib/nwc`
  - Add imports for `withBrowser`, `execPlaywright` from `@/lib/kernel`
  - Add imports for `parseInvoice` from `@/lib/bolt11`
  - Add `checkoutAndPay` and `getWalletBalance` tools
  - Increase `maxDuration` from 60 to 180
  - Increase `stepCountIs(5)` to `stepCountIs(10)`
  - Update system prompt to mention Bitcoin payment capability

---

### Phase 5: Chat UI updates

Update `frontend/components/chat.tsx` to render the new tool results.

**Loading labels** (add to the `labels` record in `renderToolPart`):

```typescript
checkoutAndPay: "Completing Bitcoin checkout...",
getWalletBalance: "Checking wallet balance...",
```

**Result rendering:**

- `getWalletBalance` → show balance in sats (simple text display)
- `checkoutAndPay` success → show payment confirmation component with
  amount, fees, preimage (truncated), and optionally the Kernel live view
  URL
- `checkoutAndPay` error → show error message

Render `checkoutAndPay` and `getWalletBalance` results inline in
`renderToolPart()` — no separate component needed for the hackathon.
For `checkoutAndPay` success, show amount, fees, and truncated preimage.
For errors, show the error message.

**Cart state cleanup:**

When `checkoutAndPay` returns `cartCompleted: true`, clear the cart in
CartProvider. Add a `clearCart()` method to CartContext that resets
`cartId` in localStorage and clears the cart state.

**Files:**
- Edit `frontend/components/chat.tsx` — loading labels + result rendering
- Edit `frontend/lib/cart-context.tsx` — add `clearCart()` method

---

### Phase 6: Environment and configuration

**New env vars in `frontend/.env.local`:**

```bash
# NWC - Nostr Wallet Connect (pre-funded demo wallet)
NWC_CONNECTION_URL=nostr+walletconnect://[pubkey]?relay=wss://relay.getalby.com/v1&secret=[secret]

# Kernel - browser automation
KERNEL_API_KEY=your-kernel-api-key

# Demo shipping address (JSON)
DEMO_SHIPPING_ADDRESS={"email":"demo@example.com","firstName":"Satoshi","lastName":"Nakamoto","address1":"123 Block St","city":"Austin","province":"TX","zip":"78701","country":"US","phone":"5125551234"}
```

**Update `.env.example`** with placeholder versions (no real keys).

**System prompt update** in chat route — add to the existing system prompt:

```
You can complete Bitcoin purchases using Lightning Network.
Before checkout, check the wallet balance with getWalletBalance.
When the user confirms a purchase, use checkoutAndPay with the
checkout URL from the cart. Report the amount paid in sats.
```

**Files:**
- Edit `frontend/.env.local` — add 3 new vars
- Edit `.env.example` — document new vars
- Edit `frontend/app/api/chat/route.ts` — update system prompt

---

## Acceptance Criteria

- [ ] `getWalletBalance` tool returns balance in sats from NWC wallet
- [ ] `checkoutAndPay` tool navigates Shopify checkout via Kernel browser
- [ ] `checkoutAndPay` extracts BOLT11 invoice from BTCPay page
- [ ] `checkoutAndPay` verifies invoice is not expired before paying
- [ ] `checkoutAndPay` pays invoice via NWC and returns preimage
- [ ] Payment amount and preimage are logged to server stdout
- [ ] Kernel browser session is cleaned up in all cases (success and failure)
- [ ] Chat UI shows loading state during checkout
- [ ] Chat UI renders payment confirmation with amount and fees
- [ ] `maxDuration` increased to 180s, step count increased to 10
- [ ] System prompt updated to describe payment capability
- [ ] Environment variables documented in `.env.example`

## Dependencies & Risks

**New npm dependencies:**
- `@getalby/sdk` — NWC client
- `websocket-polyfill@0.0.3` — required for NWC in Node.js
- `@onkernel/sdk` — Kernel browser automation
- `light-bolt11-decoder` — BOLT11 invoice parsing

**External service dependencies:**
- Kernel account + API key (free tier: $5/mo)
- NWC-compatible Lightning wallet (Alby Hub) with funded balance
- Nostr relay availability (Alby's relay: `wss://relay.getalby.com/v1`)
- BTCPay Server on store.bitcoinmagazine.com remaining operational

**Risks:**
- BTCPay checkout DOM structure may differ from expectations — mitigate
  by manual inspection before implementation
- Shopify checkout may require CAPTCHA — Kernel's stealth mode helps but
  is not guaranteed
- Lightning invoice may expire before payment completes — retry logic needed
- NWC connection string is a bearer credential — never log it, never send
  to client

## References

### Internal
- Brainstorm: `docs/brainstorms/2026-02-12-nwc-agent-payments-brainstorm.md`
- Chat route: `frontend/app/api/chat/route.ts`
- Shopify client pattern: `frontend/lib/shopify.ts`
- Tool rendering: `frontend/components/chat.tsx:renderToolPart()`
- Cart context: `frontend/lib/cart-context.tsx`

### External
- [@getalby/sdk (npm)](https://www.npmjs.com/package/@getalby/sdk) — v7.0.0
- [@onkernel/sdk (npm)](https://www.npmjs.com/package/@onkernel/sdk) — v0.18.0
- [light-bolt11-decoder (npm)](https://www.npmjs.com/package/light-bolt11-decoder) — v3.2.0
- [NIP-47 specification](https://nips.nostr.com/47) — Nostr Wallet Connect
- [Kernel Playwright Execution docs](https://www.kernel.sh/docs/browsers/playwright-execution)
- [Kernel pricing](https://www.kernel.sh/docs/info/pricing) — free tier $5/mo
- [kernel-ai-sdk-agent example](https://github.com/kernel/kernel-ai-sdk-agent)
- [BTCPay Server Greenfield API](https://docs.btcpayserver.org/API/Greenfield/v1/)

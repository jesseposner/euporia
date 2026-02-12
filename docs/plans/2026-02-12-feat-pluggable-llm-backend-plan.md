---
title: "feat: Pluggable LLM backend"
type: feat
date: 2026-02-12
---

# feat: Pluggable LLM backend

Switch between Anthropic (cloud) and a local llama-server via `LLM_PROVIDER` env var.
No UI changes. Both providers support tool calling.

## Acceptance Criteria

- [ ] `LLM_PROVIDER=local` routes to local llama-server via OpenAI-compatible API
- [ ] `LLM_PROVIDER=anthropic` (or unset) routes to Anthropic Claude Sonnet
- [ ] All six tools (searchProducts, getProductDetails, addToCart, getCart, loadTasteProfile, saveTasteProfile) work with both providers
- [ ] Streaming responses work with both providers
- [ ] No client-side changes required

## Implementation

### 1. Add `@ai-sdk/openai` dependency

```bash
cd frontend && npm install @ai-sdk/openai
```

### 2. Create `frontend/lib/llm.ts`

```typescript
import { anthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";

export function getModel() {
  const provider = process.env.LLM_PROVIDER ?? "anthropic";

  if (provider === "local") {
    const local = createOpenAI({
      baseURL: process.env.LLM_LOCAL_URL ?? "http://localhost:8080/v1",
      apiKey: "not-needed",
    });
    return local(process.env.LLM_LOCAL_MODEL ?? "qwen-coder-3");
  }

  if (provider !== "anthropic") {
    throw new Error(`Unknown LLM_PROVIDER: "${provider}". Use "anthropic" or "local".`);
  }

  return anthropic("claude-sonnet-4-20250514");
}
```

### 3. Update `frontend/app/api/chat/route.ts`

**Remove** (line 8):
```typescript
import { anthropic } from "@ai-sdk/anthropic";
```

**Add:**
```typescript
import { getModel } from "@/lib/llm";
```

**Change** (line 57):
```typescript
// Before:
model: anthropic("claude-sonnet-4-20250514"),
// After:
model: getModel(),
```

### 4. Update `frontend/.env.local`

Add (only when using local provider):
```
LLM_PROVIDER=local
LLM_LOCAL_URL=http://localhost:8080/v1
LLM_LOCAL_MODEL=qwen-coder-3
```

### 5. Smoke test

- [ ] Set `LLM_PROVIDER=anthropic`, send a chat message, verify tools and streaming work
- [ ] Set `LLM_PROVIDER=local` (with llama-server running), send a chat message, verify response
- [ ] Test a multi-step tool interaction (e.g., search then add to cart) with local provider

### 6. Document env vars in `.env.example`

Add to root `.env.example`:
```
# LLM provider: "anthropic" (default) or "local" (llama-server)
# LLM_PROVIDER=local
# LLM_LOCAL_URL=http://localhost:8080/v1
# LLM_LOCAL_MODEL=qwen-coder-3
```

## Context

- Brainstorm: `docs/brainstorms/2026-02-12-pluggable-llm-backend-brainstorm.md`
- Chat route: `frontend/app/api/chat/route.ts`
- Existing lib pattern: `frontend/lib/utils.ts`, `frontend/lib/shopify-mcp.ts`

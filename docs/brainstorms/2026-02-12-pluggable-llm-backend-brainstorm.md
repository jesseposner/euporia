# Pluggable LLM Backend

**Date:** 2026-02-12
**Status:** Brainstorm complete

## What We're Building

A provider factory that lets the app switch between Anthropic (cloud) and a local
llama-server (Qwen Coder 3) via a single environment variable. No UI changes needed.

### Current State

- All LLM logic lives in `frontend/app/api/chat/route.ts` (174 lines)
- Uses Vercel AI SDK v6, which is already provider-agnostic
- Model hardcoded: `anthropic("claude-sonnet-4-20250514")`
- No abstraction layer exists

### Target State

- New `frontend/lib/llm.ts` (~15 lines) reads `LLM_PROVIDER` env var
- Returns the appropriate AI SDK model instance
- `route.ts` imports from `lib/llm.ts` instead of hardcoding the provider
- Two providers supported: `anthropic` (default) and `local`

## Why This Approach

- **Minimal change:** One new file, one line changed in the existing route
- **AI SDK native:** Uses the SDK's built-in provider abstraction rather than inventing one
- **YAGNI:** No config objects, no per-provider settings until proven necessary
- **llama-server compatibility:** Exposes an OpenAI-compatible API, so `@ai-sdk/openai`
  pointed at `localhost` works out of the box

## Key Decisions

- **Switching mechanism:** Environment variable (`LLM_PROVIDER`), not a UI toggle
- **Tool calling:** Both providers support it; no fallback mode needed
- **Scope:** Just two providers (Anthropic + local). No generic provider registry.
- **Architecture:** Factory function pattern, not a config object

## Implementation Sketch

```
# .env.local
LLM_PROVIDER=local          # or "anthropic" (default)
LLM_LOCAL_URL=http://localhost:8080  # llama-server address
LLM_LOCAL_MODEL=qwen-coder-3        # model name for local
```

```typescript
// frontend/lib/llm.ts
import { anthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";

export function getModel() {
  if (process.env.LLM_PROVIDER === "local") {
    const local = createOpenAI({
      baseURL: process.env.LLM_LOCAL_URL ?? "http://localhost:8080/v1",
      apiKey: "not-needed",
    });
    return local(process.env.LLM_LOCAL_MODEL ?? "qwen-coder-3");
  }
  return anthropic("claude-sonnet-4-20250514");
}
```

```typescript
// frontend/app/api/chat/route.ts — only change
import { getModel } from "@/lib/llm";
// ...
const result = streamText({
  model: getModel(),  // was: anthropic("claude-sonnet-4-20250514")
  // ... rest unchanged
});
```

## Dependencies

- `@ai-sdk/openai` — needs to be added to frontend package.json
- `llama-server` — already running on user's machine

## Risks to Test

- **System prompt compatibility:** The current `SYSTEM_PROMPT` is written for Claude.
  Qwen Coder 3 may interpret it differently. Worth a quick sanity check after wiring up.
- **Multi-step tool loops:** The route uses `stopWhen: stepCountIs(5)` for agentic
  multi-turn tool calling. Verify the local model handles sequential tool calls reliably.

## Open Questions

None — all questions resolved during brainstorming.

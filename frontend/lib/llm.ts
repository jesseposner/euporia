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
    throw new Error(
      `Unknown LLM_PROVIDER: "${provider}". Use "anthropic" or "local".`,
    );
  }

  return anthropic("claude-sonnet-4-20250514");
}

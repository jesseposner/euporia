"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ProductGrid } from "@/components/product-card";
import { CartSummary } from "@/components/cart-summary";
import { cn } from "@/lib/utils";

const SUGGESTION_CHIPS = [
  { label: "Trending now", icon: "trending_up", query: "What's trending right now?" },
  { label: "Gift ideas", icon: "redeem", query: "I need gift ideas for someone special" },
  { label: "Under $50", icon: "sell", query: "Show me products under $50" },
  { label: "Best sellers", icon: "star", query: "What are your best sellers?" },
];

interface ChatProps {
  sessionId: string;
  conversationId?: string | null;
  initialMessages?: { id: string; role: "user" | "assistant"; content: string }[];
  onConversationSaved?: (convId: string) => void;
}

export function Chat({
  sessionId,
  conversationId,
  initialMessages,
  onConversationSaved,
}: ChatProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const convIdRef = useRef<string | null>(conversationId || null);
  const savingRef = useRef(false);

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: `/api/chat?sessionId=${encodeURIComponent(sessionId)}`,
    }),
    messages: initialMessages?.map((m) => ({
      ...m,
      parts: [{ type: "text" as const, text: m.content }],
    })),
  });

  const isLoading = status === "streaming" || status === "submitted";

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      // ScrollArea uses a viewport wrapper — scroll the parent viewport
      const viewport = scrollRef.current.closest("[data-radix-scroll-area-viewport]");
      const target = viewport || scrollRef.current;
      target.scrollTop = target.scrollHeight;
    }
  }, [messages]);

  // Save conversation when assistant finishes responding
  const saveConversation = useCallback(async () => {
    if (savingRef.current || messages.length === 0) return;
    savingRef.current = true;

    try {
      // Extract text-only messages for storage
      const toSave = messages.map((m) => ({
        id: m.id,
        role: m.role,
        content:
          m.parts
            ?.filter((p) => p.type === "text")
            .map((p) => (p as { text: string }).text)
            .join("") || "",
      }));

      // Derive title from first user message
      const firstUserMsg = toSave.find((m) => m.role === "user");
      const title = firstUserMsg
        ? firstUserMsg.content.slice(0, 60) + (firstUserMsg.content.length > 60 ? "..." : "")
        : "New Chat";

      if (!convIdRef.current) {
        // Create new conversation
        const res = await fetch("/api/conversations", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ sessionId, title }),
        });
        if (res.ok) {
          const data = await res.json();
          convIdRef.current = data.id;
        }
      }

      if (convIdRef.current) {
        // Save messages
        await fetch(
          `/api/conversations/${encodeURIComponent(convIdRef.current)}?sessionId=${encodeURIComponent(sessionId)}`,
          {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              messages: toSave,
              title: !conversationId ? title : undefined,
            }),
          },
        );
        onConversationSaved?.(convIdRef.current);
      }
    } catch {
      // Best effort save
    } finally {
      savingRef.current = false;
    }
  }, [messages, sessionId, conversationId, onConversationSaved]);

  // Save when streaming finishes
  useEffect(() => {
    if (status === "ready" && messages.length > 0) {
      saveConversation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    sendMessage({ text });
  }

  function handleChipClick(query: string) {
    if (isLoading) return;
    sendMessage({ text: query });
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-border bg-card/80 px-8 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="size-2 animate-pulse rounded-full bg-green-500" />
          <span className="text-sm font-medium text-muted-foreground">
            ShopAI Active
          </span>
        </div>
      </header>

      {/* Messages */}
      <ScrollArea className="flex-1">
        <div ref={scrollRef} className="mx-auto max-w-4xl space-y-8 p-4 md:p-8">
          {messages.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
              <span className="material-icons-round mb-4 text-5xl opacity-20">
                smart_toy
              </span>
              <p className="text-lg font-medium">Welcome to ShopAI</p>
              <p className="mt-1 text-sm">
                Say hello to start discovering products you&apos;ll love.
              </p>

              {/* Suggestion Chips */}
              <div className="mt-8 flex flex-wrap justify-center gap-2">
                {SUGGESTION_CHIPS.map((chip) => (
                  <button
                    key={chip.label}
                    onClick={() => handleChipClick(chip.query)}
                    className="flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md hover:shadow-primary/5"
                  >
                    <span className="material-icons-round text-base text-primary">
                      {chip.icon}
                    </span>
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex",
                message.role === "user" ? "justify-end" : "gap-4",
              )}
            >
              {message.role === "assistant" && (
                <div className="flex size-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-indigo-600 text-white shadow-lg shadow-primary/20">
                  <span className="material-icons-round text-xl">
                    smart_toy
                  </span>
                </div>
              )}

              <div
                className={cn(
                  "max-w-[85%] space-y-4",
                  message.role === "user" && "flex flex-col items-end",
                )}
              >
                {message.parts?.map((part, i) => {
                  if (part.type === "text" && part.text) {
                    return (
                      <div
                        key={i}
                        className={cn(
                          "text-sm leading-relaxed whitespace-pre-wrap",
                          message.role === "user"
                            ? "rounded-2xl rounded-tr-sm bg-primary px-5 py-3.5 text-white shadow-lg shadow-primary/10"
                            : "rounded-2xl rounded-tl-sm border border-border bg-card p-6 shadow-sm",
                        )}
                      >
                        {part.text}
                      </div>
                    );
                  }

                  // Tool invocation parts
                  const toolPart = part as {
                    type: string;
                    toolCallId?: string;
                    state?: string;
                    input?: Record<string, unknown>;
                    output?: Record<string, unknown>;
                  };

                  if (toolPart.type?.startsWith("tool-")) {
                    return renderToolPart(toolPart);
                  }

                  return null;
                })}
              </div>
            </div>
          ))}

          {isLoading &&
            messages.length > 0 &&
            messages[messages.length - 1]?.role === "user" && (
              <div className="flex gap-4">
                <div className="flex size-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-indigo-600 text-white shadow-lg shadow-primary/20">
                  <span className="material-icons-round text-xl">
                    smart_toy
                  </span>
                </div>
                <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm border border-border bg-card px-5 py-3.5 text-sm shadow-sm">
                  <span className="material-icons-round animate-spin text-base text-primary">
                    progress_activity
                  </span>
                  Thinking...
                </div>
              </div>
            )}

          {/* Spacer for input area */}
          <div className="h-24" />
        </div>
      </ScrollArea>

      {/* Error display */}
      {error && (
        <div className="mx-auto max-w-4xl border-t border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          Something went wrong. Please try again.
        </div>
      )}

      {/* Input bar */}
      <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-background via-background to-transparent p-6">
        <div className="mx-auto max-w-4xl">
          <form
            onSubmit={handleSubmit}
            className="relative flex items-end rounded-2xl border border-border bg-card p-2 shadow-xl focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/50"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="Ask for products, styles, or specific features..."
              disabled={isLoading}
              rows={1}
              className="w-full resize-none border-0 bg-transparent px-4 py-3.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-0"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isLoading}
              className="mb-0.5 ml-2 rounded-xl bg-primary shadow-lg shadow-primary/30 hover:scale-105 active:scale-95"
            >
              <span className="material-icons-round">send</span>
            </Button>
          </form>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            ShopAI can make mistakes. Check important info.
          </p>
        </div>
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderToolPart(part: any) {
  const key = part.toolCallId || Math.random().toString();
  const toolName = part.type?.replace("tool-", "") || part.toolName || "";

  // Loading states
  if (part.state !== "output-available") {
    const labels: Record<string, string> = {
      searchProducts: "Searching products...",
      getProductDetails: "Getting product details...",
      addToCart: "Adding to cart...",
      updateCartItems: "Updating cart...",
      removeFromCart: "Removing from cart...",
      applyDiscountCode: "Applying discount...",
      getCart: "Loading cart...",
      searchPolicies: "Looking up store info...",
      loadTasteProfile: "",
      saveTasteProfile: "",
    };
    const label = labels[toolName];
    if (!label) return null;
    return (
      <div
        key={key}
        className="flex items-center gap-2 text-xs text-muted-foreground"
      >
        <span className="material-icons-round animate-spin text-sm text-primary">
          progress_activity
        </span>
        {label}
      </div>
    );
  }

  // Result states
  const output = part.output;

  if (toolName === "searchProducts" && output?.products) {
    return <ProductGrid key={key} products={output.products} />;
  }

  if (toolName === "getProductDetails" && output) {
    return <ProductGrid key={key} products={[output]} />;
  }

  const cartTools = ["addToCart", "updateCartItems", "removeFromCart", "applyDiscountCode", "getCart"];
  if (cartTools.includes(toolName) && output) {
    return <CartSummary key={key} cart={output} />;
  }

  // Silent tools (loadTasteProfile, saveTasteProfile, searchPolicies — text handled by LLM)
  return null;
}

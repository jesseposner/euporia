"use client";

import { useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ProductGrid } from "@/components/product-card";
import { CartSummary } from "@/components/cart-summary";
import { Send, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function Chat({ sessionId }: { sessionId: string }) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: `/api/chat?sessionId=${encodeURIComponent(sessionId)}`,
    }),
  });

  const isLoading = status === "streaming" || status === "submitted";

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    sendMessage({ text });
  }

  return (
    <div className="flex h-dvh flex-col">
      {/* Header */}
      <header className="border-b px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center gap-2">
          <Sparkles className="text-primary size-5" />
          <h1 className="text-lg font-semibold">euporia</h1>
          <span className="text-muted-foreground text-sm">
            personal shopping concierge
          </span>
        </div>
      </header>

      {/* Messages */}
      <ScrollArea className="flex-1">
        <div ref={scrollRef} className="mx-auto max-w-2xl px-4 py-6">
          {messages.length === 0 && !isLoading && (
            <div className="text-muted-foreground flex flex-col items-center justify-center py-20 text-center">
              <Sparkles className="mb-4 size-10 opacity-20" />
              <p className="text-lg font-medium">Welcome to euporia</p>
              <p className="mt-1 text-sm">
                Say hello to start discovering products you&apos;ll love.
              </p>
            </div>
          )}

          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3",
                  message.role === "user" ? "justify-end" : "justify-start",
                )}
              >
                {message.role === "assistant" && (
                  <Avatar size="sm" className="mt-0.5 shrink-0">
                    <AvatarFallback>
                      <Sparkles className="size-3" />
                    </AvatarFallback>
                  </Avatar>
                )}

                <div
                  className={cn(
                    "max-w-[85%] space-y-2",
                    message.role === "user" && "flex flex-col items-end",
                  )}
                >
                  {message.parts?.map((part, i) => {
                    if (part.type === "text" && part.text) {
                      return (
                        <div
                          key={i}
                          className={cn(
                            "rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
                            message.role === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted",
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

                    if (
                      toolPart.type === "tool-searchProducts" ||
                      toolPart.type === "tool-invocation"
                    ) {
                      return renderToolPart(toolPart);
                    }

                    // Match tool-* pattern
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
                <div className="flex gap-3">
                  <Avatar size="sm" className="mt-0.5 shrink-0">
                    <AvatarFallback>
                      <Sparkles className="size-3" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-muted flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm">
                    <Loader2 className="size-3.5 animate-spin" />
                    Thinking...
                  </div>
                </div>
              )}
          </div>
        </div>
      </ScrollArea>

      {/* Error display */}
      {error && (
        <div className="border-destructive/50 bg-destructive/10 text-destructive mx-auto max-w-2xl border-t px-4 py-2 text-sm">
          Something went wrong. Please try again.
        </div>
      )}

      {/* Input bar */}
      <div className="border-t">
        <form
          onSubmit={handleSubmit}
          className="mx-auto flex max-w-2xl items-center gap-2 px-4 py-3"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="What are you looking for?"
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading}
          >
            {isLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </form>
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
      getCart: "Loading cart...",
      loadTasteProfile: "",
      saveTasteProfile: "",
    };
    const label = labels[toolName];
    if (!label) return null;
    return (
      <div
        key={key}
        className="text-muted-foreground flex items-center gap-2 text-xs"
      >
        <Loader2 className="size-3 animate-spin" />
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

  if ((toolName === "addToCart" || toolName === "getCart") && output) {
    return <CartSummary key={key} cart={output} />;
  }

  // Silent tools (loadTasteProfile, saveTasteProfile)
  return null;
}

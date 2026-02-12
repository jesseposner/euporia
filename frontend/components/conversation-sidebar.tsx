"use client";

import { cn } from "@/lib/utils";

export interface Conversation {
  id: string;
  title: string;
  updated_at?: string;
}

interface ConversationSidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  isLoading: boolean;
}

export function ConversationSidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  isLoading,
}: ConversationSidebarProps) {
  return (
    <div className="flex h-full w-64 flex-shrink-0 flex-col border-r border-border bg-card/50">
      {/* New Chat Button */}
      <div className="border-b border-border p-3">
        <button
          onClick={onNew}
          className="flex w-full items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
        >
          <span className="material-icons-round text-lg">add</span>
          New Chat
        </button>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="space-y-2 p-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-10 animate-pulse rounded-lg bg-muted/50"
              />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <span className="material-icons-round mb-2 text-2xl text-muted-foreground opacity-30">
              chat_bubble_outline
            </span>
            <p className="text-xs text-muted-foreground/60">
              No conversations yet
            </p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                  activeId === conv.id
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <span className="material-icons-round text-base">
                  {activeId === conv.id ? "chat" : "chat_bubble_outline"}
                </span>
                <span className="flex-1 truncate">{conv.title}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

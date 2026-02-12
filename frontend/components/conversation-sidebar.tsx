"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { UserProfileBadge } from "@/components/user-profile-badge";

export interface Conversation {
  id: string;
  title: string;
  updated_at?: string;
  category?: string;
  icon?: string;
}

interface ConversationSidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  isLoading: boolean;
}

interface GroupedConversations {
  label: string;
  conversations: Conversation[];
}

function groupByTimePeriod(conversations: Conversation[]): GroupedConversations[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);

  const groups: Record<string, Conversation[]> = {
    Today: [],
    Yesterday: [],
    "Last Week": [],
    Older: [],
  };

  for (const conv of conversations) {
    if (!conv.updated_at) {
      groups["Older"].push(conv);
      continue;
    }

    const updatedAt = new Date(conv.updated_at);

    if (updatedAt >= today) {
      groups["Today"].push(conv);
    } else if (updatedAt >= yesterday) {
      groups["Yesterday"].push(conv);
    } else if (updatedAt >= lastWeek) {
      groups["Last Week"].push(conv);
    } else {
      groups["Older"].push(conv);
    }
  }

  return ["Today", "Yesterday", "Last Week", "Older"]
    .filter((label) => groups[label].length > 0)
    .map((label) => ({ label, conversations: groups[label] }));
}

export function ConversationSidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  isLoading,
}: ConversationSidebarProps) {
  const grouped = useMemo(() => groupByTimePeriod(conversations), [conversations]);

  return (
    <div className="flex h-full w-64 flex-shrink-0 flex-col border-r border-border bg-card/50">
      {/* New Shopping Mission Button */}
      <div className="border-b border-border p-3">
        <button
          onClick={onNew}
          className="flex w-full items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
        >
          <span className="material-icons-round text-lg">add</span>
          New Shopping Mission
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
          <div className="space-y-3">
            {grouped.map((group) => (
              <div key={group.label}>
                <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {group.conversations.map((conv) => {
                    const iconName = conv.icon || "chat_bubble_outline";
                    const activeIcon = conv.icon || "chat";
                    return (
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
                          {activeId === conv.id ? activeIcon : iconName}
                        </span>
                        <span className="flex-1 truncate">{conv.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* User Profile Badge */}
      <div className="border-t border-border p-3">
        <UserProfileBadge />
      </div>
    </div>
  );
}

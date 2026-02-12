"use client";

import { useState, useEffect, useCallback } from "react";
import { Chat } from "@/components/chat";
import {
  ConversationSidebar,
  type Conversation,
} from "@/components/conversation-sidebar";

function getOrCreateSessionId(): string {
  const key = "shopai-session";
  const stored = localStorage.getItem(key);
  if (stored) return stored;
  const id = crypto.randomUUID();
  localStorage.setItem(key, id);
  return id;
}

export default function ChatPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [initialMessages, setInitialMessages] = useState<
    { id: string; role: "user" | "assistant"; content: string }[] | undefined
  >(undefined);
  const [chatKey, setChatKey] = useState(0);
  const [isLoadingConvs, setIsLoadingConvs] = useState(true);

  useEffect(() => {
    setSessionId(getOrCreateSessionId());
  }, []);

  const fetchConversations = useCallback(async (sid: string) => {
    setIsLoadingConvs(true);
    try {
      const res = await fetch(
        `/api/conversations?sessionId=${encodeURIComponent(sid)}`,
      );
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch {
      // Silently handle
    } finally {
      setIsLoadingConvs(false);
    }
  }, []);

  // Load conversations on mount
  useEffect(() => {
    if (sessionId) {
      fetchConversations(sessionId);
    }
  }, [sessionId, fetchConversations]);

  async function handleNewChat() {
    setActiveConvId(null);
    setInitialMessages(undefined);
    setChatKey((k) => k + 1);
  }

  async function handleSelectConversation(convId: string) {
    if (!sessionId) return;
    setActiveConvId(convId);

    try {
      const res = await fetch(
        `/api/conversations/${encodeURIComponent(convId)}?sessionId=${encodeURIComponent(sessionId)}`,
      );
      if (res.ok) {
        const data = await res.json();
        const msgs = data.messages || [];
        setInitialMessages(
          msgs.map((m: { id?: string; role: string; content: string }) => ({
            id: m.id || crypto.randomUUID(),
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
        );
        setChatKey((k) => k + 1);
      }
    } catch {
      // Fall through with no messages
    }
  }

  const handleConversationSaved = useCallback(
    (convId: string) => {
      // Update active conversation and refresh list
      setActiveConvId(convId);
      if (sessionId) {
        fetchConversations(sessionId);
      }
    },
    [sessionId, fetchConversations],
  );

  if (!sessionId) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <ConversationSidebar
        conversations={conversations}
        activeId={activeConvId}
        onSelect={handleSelectConversation}
        onNew={handleNewChat}
        isLoading={isLoadingConvs}
      />
      <div className="flex flex-1 flex-col">
        <Chat
          key={chatKey}
          sessionId={sessionId}
          conversationId={activeConvId}
          initialMessages={initialMessages}
          onConversationSaved={handleConversationSaved}
        />
      </div>
    </div>
  );
}

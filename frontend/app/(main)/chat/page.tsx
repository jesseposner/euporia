"use client";

import { useState, useEffect } from "react";
import { Chat } from "@/components/chat";

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

  useEffect(() => {
    setSessionId(getOrCreateSessionId());
  }, []);

  if (!sessionId) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return <Chat sessionId={sessionId} />;
}

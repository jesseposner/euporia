"use client";

import { useState, useEffect } from "react";
import { Chat } from "@/components/chat";

function getOrCreateSessionId(): string {
  const key = "euporia-session";
  const stored = localStorage.getItem(key);
  if (stored) return stored;
  const id = crypto.randomUUID();
  localStorage.setItem(key, id);
  return id;
}

export default function Home() {
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    setSessionId(getOrCreateSessionId());
  }, []);

  if (!sessionId) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <div className="text-muted-foreground text-sm">Loading...</div>
      </div>
    );
  }

  return <Chat sessionId={sessionId} />;
}

const SESSION_KEY = "shopai-session";

export function getOrCreateSessionId(): string | null {
  if (typeof window === "undefined") return null;

  const stored = localStorage.getItem(SESSION_KEY);
  if (stored) return stored;

  const id = crypto.randomUUID();
  localStorage.setItem(SESSION_KEY, id);
  return id;
}

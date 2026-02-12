CREATE TABLE IF NOT EXISTS cart_sessions (
  session_id TEXT PRIMARY KEY,
  cart_id TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

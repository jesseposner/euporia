CREATE TABLE IF NOT EXISTS ai_insights_cache (
  product_handle TEXT PRIMARY KEY,
  insight_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);

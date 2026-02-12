CREATE TABLE IF NOT EXISTS bundles (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    title TEXT NOT NULL,
    description TEXT,
    discount_pct INTEGER NOT NULL DEFAULT 0,
    items_json TEXT NOT NULL DEFAULT '[]',
    image_url TEXT,
    original_price TEXT,
    discounted_price TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS replenishment_items (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    session_id TEXT NOT NULL,
    product_title TEXT NOT NULL,
    product_handle TEXT,
    product_image TEXT,
    price TEXT,
    urgency TEXT NOT NULL DEFAULT 'suggested',
    best_retailer TEXT,
    depletion_date TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_replenishment_session ON replenishment_items(session_id);

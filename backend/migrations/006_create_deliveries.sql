CREATE TABLE IF NOT EXISTS deliveries (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    session_id TEXT NOT NULL,
    retailer TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'in_transit',
    progress_pct INTEGER NOT NULL DEFAULT 0,
    est_delivery TEXT,
    items_json TEXT NOT NULL DEFAULT '[]',
    order_number TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_deliveries_session ON deliveries(session_id);

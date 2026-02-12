CREATE TABLE IF NOT EXISTS price_history (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    product_handle TEXT NOT NULL,
    product_title TEXT,
    product_image TEXT,
    price TEXT NOT NULL,
    previous_price TEXT,
    retailer TEXT,
    recorded_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_price_history_handle ON price_history(product_handle);
CREATE INDEX idx_price_history_recorded ON price_history(recorded_at);

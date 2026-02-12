CREATE TABLE IF NOT EXISTS wishlist_items (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    session_id TEXT NOT NULL,
    product_handle TEXT NOT NULL,
    product_title TEXT,
    product_image TEXT,
    product_price TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(session_id, product_handle)
);

CREATE INDEX idx_wishlist_session ON wishlist_items(session_id);

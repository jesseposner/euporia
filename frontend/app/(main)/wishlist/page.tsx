"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { SearchHeader } from "@/components/search-header";
import { Button } from "@/components/ui/button";
import { getOrCreateSessionId } from "@/lib/session";

interface WishlistItem {
  id: string;
  product_handle?: string;
  product_title?: string;
  product_image?: string;
  product_price?: string;
  created_at?: string;
}

export default function WishlistPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    setSessionId(getOrCreateSessionId());
  }, []);

  const fetchWishlist = useCallback(async (sid: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/wishlist?sessionId=${encodeURIComponent(sid)}`,
      );
      if (!res.ok) {
        setItems([]);
        return;
      }

      const data = await res.json();
      const nextItems = Array.isArray(data.items)
        ? data.items
        : Array.isArray(data.wishlist)
          ? data.wishlist
          : [];
      setItems(nextItems);
    } catch {
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    void fetchWishlist(sessionId);
  }, [sessionId, fetchWishlist]);

  async function handleRemove(itemId: string) {
    if (!sessionId) return;

    setRemovingId(itemId);
    try {
      await fetch(
        `/api/wishlist/${encodeURIComponent(itemId)}?sessionId=${encodeURIComponent(sessionId)}`,
        { method: "DELETE" },
      );
      await fetchWishlist(sessionId);
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <SearchHeader title="Wishlist" showGreeting />
      <div className="mx-auto max-w-4xl px-6 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16 text-center">
            <span className="material-icons-round mb-3 text-4xl text-muted-foreground opacity-30">
              favorite_border
            </span>
            <p className="text-sm font-medium text-muted-foreground">
              Your wishlist is empty
            </p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              Save products you want to revisit before checkout.
            </p>
            <Button asChild className="mt-4">
              <Link href="/discover">Explore products</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-4 rounded-xl border border-border bg-card p-3"
              >
                <Link
                  href={item.product_handle ? `/products/${item.product_handle}` : "/"}
                  className="relative size-16 flex-shrink-0 overflow-hidden rounded-lg bg-muted"
                >
                  {item.product_image ? (
                    <Image
                      src={item.product_image}
                      alt={item.product_title || "Wishlist product"}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  ) : (
                    <span className="material-icons-round absolute inset-0 flex items-center justify-center text-muted-foreground/40">
                      image
                    </span>
                  )}
                </Link>

                <div className="min-w-0 flex-1">
                  <Link
                    href={item.product_handle ? `/products/${item.product_handle}` : "/"}
                    className="line-clamp-1 text-sm font-medium hover:text-primary"
                  >
                    {item.product_title || item.product_handle || "Untitled product"}
                  </Link>
                  {item.product_price && (
                    <p className="mt-1 text-sm font-semibold text-primary">
                      ${item.product_price}
                    </p>
                  )}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleRemove(item.id)}
                  disabled={removingId === item.id}
                >
                  {removingId === item.id ? "Removing..." : "Remove"}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

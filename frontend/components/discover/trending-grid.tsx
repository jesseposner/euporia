"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useState, type MouseEvent } from "react";
import { ProductCard } from "@/components/product-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMerchant } from "@/lib/merchant-context";
import { getOrCreateSessionId } from "@/lib/session";
import type { Product } from "@/lib/shopify";

interface WishlistItem {
  id?: string;
  product_handle?: string;
}

export function TrendingGrid() {
  const { merchant } = useMerchant();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [wishlistByHandle, setWishlistByHandle] = useState<Record<string, string>>({});
  const [pendingHandle, setPendingHandle] = useState<string | null>(null);

  useEffect(() => {
    setSessionId(getOrCreateSessionId());
  }, []);

  const fetchWishlist = useCallback(async (sid: string) => {
    try {
      const res = await fetch(`/api/wishlist?sessionId=${encodeURIComponent(sid)}`);
      if (!res.ok) return;
      const data = await res.json();
      const items = Array.isArray(data.items)
        ? data.items
        : Array.isArray(data.wishlist)
          ? data.wishlist
          : [];

      const next: Record<string, string> = {};
      for (const item of items as WishlistItem[]) {
        if (item.product_handle && item.id) next[item.product_handle] = item.id;
      }
      setWishlistByHandle(next);
    } catch {
      // Best effort sync.
    }
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    void fetchWishlist(sessionId);
  }, [sessionId, fetchWishlist]);

  const toggleWishlist = useCallback(
    async (e: MouseEvent<HTMLButtonElement>, product: Product) => {
      e.preventDefault();
      e.stopPropagation();

      const handle = product.handle;
      if (!sessionId || !handle || pendingHandle === handle) return;

      setPendingHandle(handle);
      try {
        const itemId = wishlistByHandle[handle];
        if (itemId) {
          await fetch(
            `/api/wishlist/${encodeURIComponent(itemId)}?sessionId=${encodeURIComponent(sessionId)}`,
            { method: "DELETE" },
          );
        } else {
          await fetch("/api/wishlist", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              sessionId,
              product_handle: handle,
              product_title: product.title,
              product_image: product.images?.[0]?.url,
              product_price: product.priceRange?.minVariantPrice?.amount,
            }),
          });
        }

        await fetchWishlist(sessionId);
      } finally {
        setPendingHandle(null);
      }
    },
    [fetchWishlist, pendingHandle, sessionId, wishlistByHandle],
  );

  const trendingQuery = useQuery({
    queryKey: ["trending", merchant.domain],
    queryFn: async () => {
      const res = await fetch(
        `/api/products?store=${encodeURIComponent(merchant.domain)}&limit=18&pages=3`,
      );
      if (!res.ok) throw new Error("Failed to load trending products");
      const data = (await res.json()) as { products?: Product[] };
      return data.products || [];
    },
  });

  const products = trendingQuery.data || [];

  return (
    <section>
      <div className="mb-6 flex items-center gap-2">
        <span className="material-icons-round text-yellow-400">bolt</span>
        <h2 className="text-xl font-bold">Trending For You</h2>
      </div>

      {trendingQuery.isPending ? (
        <TrendingSkeleton />
      ) : products.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product, i) => (
            <div key={product.handle || i} className="group relative">
              <ProductCard product={product} />
              <button
                type="button"
                onClick={(e) => void toggleWishlist(e, product)}
                disabled={!product.handle || pendingHandle === product.handle}
                className="absolute right-3 top-3 z-10 flex size-8 items-center justify-center rounded-full bg-card/80 text-muted-foreground shadow-sm backdrop-blur-sm transition-colors hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="material-icons-round text-lg">
                  {pendingHandle === product.handle
                    ? "progress_activity"
                    : product.handle && wishlistByHandle[product.handle]
                      ? "favorite"
                      : "favorite_border"}
                </span>
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">
          <span className="material-icons-round mb-3 text-4xl text-muted-foreground opacity-30">
            trending_up
          </span>
          <p className="text-sm font-medium text-muted-foreground">
            No trending products right now
          </p>
        </div>
      )}
    </section>
  );
}

function TrendingSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 9 }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-xl border border-border bg-card"
        >
          <Skeleton className="aspect-[4/3] w-full" />
          <div className="p-4">
            <Skeleton className="mb-2 h-3 w-16" />
            <Skeleton className="mb-3 h-5 w-3/4" />
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="size-9 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

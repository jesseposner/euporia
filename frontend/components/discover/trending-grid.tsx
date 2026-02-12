"use client";

import { useCallback, useEffect, useState } from "react";
import { ProductCard } from "@/components/product-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMerchant } from "@/lib/merchant-context";
import type { Product } from "@/lib/shopify";

export function TrendingGrid() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { merchant } = useMerchant();

  const fetchTrending = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/products?q=trending&store=${encodeURIComponent(merchant.domain)}`,
      );
      if (res.ok) {
        const data = await res.json();
        setProducts((data.products || []).slice(0, 6));
      }
    } catch {
      // Silently handle
    } finally {
      setIsLoading(false);
    }
  }, [merchant.domain]);

  useEffect(() => {
    fetchTrending();
  }, [fetchTrending]);

  return (
    <section>
      <div className="mb-6 flex items-center gap-2">
        <span className="material-icons-round text-yellow-400">bolt</span>
        <h2 className="text-xl font-bold">Trending For You</h2>
      </div>

      {isLoading ? (
        <TrendingSkeleton />
      ) : products.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product, i) => (
            <div key={product.handle || i} className="group relative">
              <ProductCard product={product} />
              <button className="absolute right-3 top-3 z-10 flex size-8 items-center justify-center rounded-full bg-card/80 text-muted-foreground shadow-sm backdrop-blur-sm transition-colors hover:text-red-400">
                <span className="material-icons-round text-lg">
                  favorite_border
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
      {Array.from({ length: 6 }).map((_, i) => (
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

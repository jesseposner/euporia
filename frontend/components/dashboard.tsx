"use client";

import { useCallback, useEffect, useState } from "react";
import { SearchHeader } from "@/components/search-header";
import { WelcomeBanner } from "@/components/dashboard/welcome-banner";
import { MasterCart } from "@/components/dashboard/master-cart";
import { ProductGrid } from "@/components/product-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMerchant } from "@/lib/merchant-context";
import type { Product } from "@/lib/shopify";

export function Dashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { merchant } = useMerchant();

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/products?store=${encodeURIComponent(merchant.domain)}`,
      );
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      }
    } catch {
      // Silently handle
    } finally {
      setIsLoading(false);
    }
  }, [merchant.domain]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-y-auto">
        <SearchHeader title="Overview" showGreeting />
        <div className="mx-auto max-w-7xl space-y-8 px-6 py-6">
          <WelcomeBanner />
          {isLoading ? (
            <ProductGridSkeleton />
          ) : products.length > 0 ? (
            <ProductGrid products={products} />
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">
              <span className="material-icons-round mb-3 text-4xl text-muted-foreground opacity-30">
                inventory_2
              </span>
              <p className="text-sm text-muted-foreground">
                No products available
              </p>
            </div>
          )}
        </div>
      </div>
      <aside className="hidden w-96 lg:block">
        <MasterCart />
      </aside>
    </div>
  );
}

function ProductGridSkeleton() {
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

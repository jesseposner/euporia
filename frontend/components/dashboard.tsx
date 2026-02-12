"use client";

import { useCallback, useEffect, useState } from "react";
import { ProductGrid } from "@/components/product-card";
import { CartPanel } from "@/components/cart-panel";
import { Skeleton } from "@/components/ui/skeleton";
import type { Product } from "@/lib/shopify";

export function Dashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const fetchProducts = useCallback(async (query: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/products?q=${encodeURIComponent(query)}`,
      );
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      }
    } catch {
      // Silently handle — empty state will show
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts("");
  }, [fetchProducts]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearchQuery(searchInput);
    fetchProducts(searchInput);
  }

  return (
    <div className="flex h-full">
      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header bar */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h1 className="text-xl font-bold">Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Browse products and manage your cart
            </p>
          </div>
        </div>

        {/* Search bar */}
        <div className="border-b border-border px-6 py-3">
          <form onSubmit={handleSearch} className="relative max-w-xl">
            <span className="material-icons-round absolute left-3 top-1/2 -translate-y-1/2 text-lg text-muted-foreground">
              search
            </span>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search products..."
              className="h-10 w-full rounded-lg border border-border bg-background pl-10 pr-4 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-1 focus:ring-primary/30"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput("");
                  setSearchQuery("");
                  fetchProducts("");
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <span className="material-icons-round text-lg">close</span>
              </button>
            )}
          </form>
          {searchQuery && (
            <p className="mt-2 text-xs text-muted-foreground">
              Showing results for &ldquo;{searchQuery}&rdquo;
              {!isLoading && ` \u2014 ${products.length} products`}
            </p>
          )}
        </div>

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <ProductGridSkeleton />
          ) : products.length > 0 ? (
            <ProductGrid products={products} />
          ) : (
            <div className="flex flex-col items-center justify-center py-16">
              <span className="material-icons-round mb-3 text-4xl text-muted-foreground opacity-30">
                inventory_2
              </span>
              <p className="text-sm font-medium text-muted-foreground">
                No products found
              </p>
              {searchQuery && (
                <p className="mt-1 text-xs text-muted-foreground/60">
                  Try a different search term
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Cart sidebar */}
      <div className="hidden w-72 flex-shrink-0 lg:block">
        <CartPanel />
      </div>
    </div>
  );
}

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-xl border border-border bg-card"
        >
          <Skeleton className="aspect-[4/3] w-full" />
          <div className="p-4">
            <Skeleton className="mb-2 h-5 w-3/4" />
            <Skeleton className="mb-4 h-3 w-full" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

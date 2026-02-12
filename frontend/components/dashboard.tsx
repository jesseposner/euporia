"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ProductGrid } from "@/components/product-card";
import { CartPanel } from "@/components/cart-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { useMerchant } from "@/lib/merchant-context";
import type { Product } from "@/lib/shopify";

interface RecentConversation {
  id: string;
  title: string;
  updated_at?: string;
}

export function Dashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [recentChats, setRecentChats] = useState<RecentConversation[]>([]);
  const { merchant } = useMerchant();

  const fetchProducts = useCallback(async (query: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/products?q=${encodeURIComponent(query)}&store=${encodeURIComponent(merchant.domain)}`,
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
  }, [merchant.domain]);

  useEffect(() => {
    setSearchInput("");
    setSearchQuery("");
    fetchProducts("");
  }, [fetchProducts]);

  // Fetch recent conversations
  useEffect(() => {
    async function loadChats() {
      const sessionId = localStorage.getItem("shopai-session");
      if (!sessionId) return;
      try {
        const res = await fetch(
          `/api/conversations?sessionId=${encodeURIComponent(sessionId)}`,
        );
        if (res.ok) {
          const data = await res.json();
          setRecentChats((data.conversations || []).slice(0, 5));
        }
      } catch {
        // Silently handle
      }
    }
    loadChats();
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearchQuery(searchInput);
    fetchProducts(searchInput);
  }

  return (
    <div className="flex h-full">
      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b border-border bg-card/90 px-6 backdrop-blur-sm md:px-8">
          <div className="hidden items-center gap-2 text-sm font-medium text-muted-foreground md:flex">
            <span className="material-icons-round text-base text-primary">{merchant.icon}</span>
            {merchant.name}
          </div>
          <div className="flex items-center gap-4">
            <button className="relative rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent">
              <span className="material-icons-round">notifications_none</span>
            </button>
          </div>
        </header>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl space-y-10 px-6 py-8 md:px-8">
            {/* Hero Search */}
            <section className="flex flex-col items-center justify-center space-y-6 pb-4 pt-8 text-center">
              <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
                What are you{" "}
                <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
                  shopping for
                </span>{" "}
                today?
              </h1>
              <div className="group relative w-full max-w-3xl">
                {/* Glow effect */}
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-primary to-purple-600 opacity-25 blur transition duration-1000 group-hover:opacity-50 group-hover:duration-200" />
                <form
                  onSubmit={handleSearch}
                  className="relative flex items-center overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
                >
                  <span className="material-icons-round animate-pulse pl-4 text-2xl text-primary">
                    auto_awesome
                  </span>
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Try 'Gift ideas' or 'Best sellers under $50'..."
                    className="w-full border-none bg-transparent px-4 py-4 text-lg placeholder-muted-foreground/60 focus:outline-none focus:ring-0"
                  />
                  <button
                    type="submit"
                    className="m-2 flex items-center gap-2 rounded-lg bg-primary px-6 py-2 font-medium text-white transition-colors hover:bg-blue-600"
                  >
                    <span>Search</span>
                    <span className="material-icons-round text-sm">
                      arrow_forward
                    </span>
                  </button>
                </form>
              </div>

              {/* Suggestion Chips */}
              <div className="flex flex-wrap justify-center gap-3">
                {[
                  "Best sellers",
                  "New arrivals",
                  "Under $50",
                  "Gift ideas",
                ].map((chip) => (
                  <button
                    key={chip}
                    onClick={() => {
                      setSearchInput(chip);
                      setSearchQuery(chip);
                      fetchProducts(chip);
                    }}
                    className="rounded-full border border-border bg-card px-4 py-1.5 text-sm shadow-sm transition-colors hover:border-primary/50 hover:text-primary"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </section>

            {/* Search results label */}
            {searchQuery && (
              <div className="flex items-center gap-2">
                <span className="material-icons-round text-primary">
                  search
                </span>
                <span className="text-sm text-muted-foreground">
                  Results for &ldquo;{searchQuery}&rdquo;
                  {!isLoading && ` \u2014 ${products.length} products`}
                </span>
                <button
                  onClick={() => {
                    setSearchInput("");
                    setSearchQuery("");
                    fetchProducts("");
                  }}
                  className="ml-2 text-xs text-primary hover:underline"
                >
                  Clear
                </button>
              </div>
            )}

            {/* Product Section */}
            <section>
              <div className="mb-6 flex items-center gap-2">
                <span className="material-icons-round text-yellow-400">
                  bolt
                </span>
                <h2 className="text-xl font-bold">
                  {searchQuery ? "Results" : "Trending for You"}
                </h2>
              </div>

              {isLoading ? (
                <ProductGridSkeleton />
              ) : products.length > 0 ? (
                <ProductGrid products={products} />
              ) : (
                <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">
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
            </section>

            {/* Recent Chats */}
            {recentChats.length > 0 && (
              <section>
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-icons-round text-purple-400">
                      chat
                    </span>
                    <h2 className="text-lg font-bold">Recent Chats</h2>
                  </div>
                  <Link
                    href="/chat"
                    className="flex items-center gap-1 text-sm font-medium text-primary hover:text-blue-400"
                  >
                    View all
                    <span className="material-icons-round text-sm">
                      arrow_forward
                    </span>
                  </Link>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {recentChats.map((chat) => (
                    <Link
                      key={chat.id}
                      href="/chat"
                      className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:border-primary/50 hover:shadow-md"
                    >
                      <span className="material-icons-round text-lg text-muted-foreground">
                        chat_bubble_outline
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {chat.title}
                        </p>
                        {chat.updated_at && (
                          <p className="text-xs text-muted-foreground/60">
                            {new Date(chat.updated_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <span className="material-icons-round text-sm text-muted-foreground/40">
                        chevron_right
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Footer spacer */}
            <div className="h-8" />
          </div>
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

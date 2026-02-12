"use client";

import { SearchHeader } from "@/components/search-header";
import { HeroSearch } from "@/components/discover/hero-search";
import { TrendingGrid } from "@/components/discover/trending-grid";

export function DiscoverHub() {
  return (
    <div className="flex-1 overflow-y-auto">
      <SearchHeader title="Discover" showGreeting />
      <div className="mx-auto max-w-7xl space-y-8 px-6 py-6">
        <HeroSearch />
        <TrendingGrid />
      </div>
    </div>
  );
}

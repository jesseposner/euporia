"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const suggestions = ["Fashion", "Electronics", "Home Decor", "Sports", "Beauty"];

export function HeroSearch() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  function navigate(q: string) {
    router.push(`/chat?q=${encodeURIComponent(q)}`);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) navigate(query.trim());
  }

  return (
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
          onSubmit={handleSubmit}
          className="relative flex items-center overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
        >
          <span className="material-icons-round animate-pulse pl-4 text-2xl text-primary">
            auto_awesome
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Try 'Gift ideas' or 'Best sellers under $50'..."
            className="w-full border-none bg-transparent px-4 py-4 text-lg placeholder-muted-foreground/60 focus:outline-none focus:ring-0"
          />
          <button
            type="submit"
            className="m-2 flex items-center gap-2 rounded-lg bg-primary px-6 py-2 font-medium text-white transition-colors hover:bg-blue-600"
          >
            <span>Generate</span>
            <span className="material-icons-round text-sm">arrow_forward</span>
          </button>
        </form>
      </div>

      {/* Suggestion Chips */}
      <div className="flex flex-wrap justify-center gap-3">
        {suggestions.map((chip) => (
          <button
            key={chip}
            onClick={() => navigate(chip)}
            className="rounded-full border border-border bg-card px-4 py-1.5 text-sm shadow-sm transition-colors hover:border-primary/50 hover:text-primary"
          >
            {chip}
          </button>
        ))}
      </div>
    </section>
  );
}

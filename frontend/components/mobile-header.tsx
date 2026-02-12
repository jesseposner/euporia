"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Home", icon: "dashboard" },
  { href: "/discover", label: "Discover", icon: "explore" },
  { href: "/chat", label: "Chat", icon: "smart_toy" },
];

export function MobileHeader() {
  const pathname = usePathname();

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4 md:hidden">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2">
        <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-white">
          <span className="material-icons-round text-sm">shopping_bag</span>
        </div>
        <span className="text-base font-bold tracking-tight">
          Shop<span className="text-primary">AI</span>
        </span>
      </Link>

      {/* Nav + Actions */}
      <div className="flex items-center gap-1">
        <nav className="flex gap-1">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground",
                )}
              >
                <span className="material-icons-round text-lg">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <button className="relative rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-accent">
          <span className="material-icons-round text-xl">notifications_none</span>
        </button>
      </div>
    </header>
  );
}

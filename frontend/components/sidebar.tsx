"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/lib/cart-context";
import { cn } from "@/lib/utils";

const discoverItems = [
  { href: "/", label: "Dashboard", icon: "dashboard" },
  { href: "/chat", label: "AI Concierge", icon: "smart_toy" },
];

const yourSpaceItems = [
  { href: "#", label: "Wishlist", icon: "favorite_border" },
  { href: "#", label: "Settings", icon: "settings" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { cart } = useCart();
  const cartCount = cart?.totalQuantity || 0;

  function renderNavItem(item: { href: string; label: string; icon: string }) {
    const isActive =
      item.href === "/"
        ? pathname === "/"
        : item.href !== "#" && pathname.startsWith(item.href);

    return (
      <Link
        key={item.href + item.label}
        href={item.href}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          isActive
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-accent hover:text-foreground",
        )}
      >
        <span
          className={cn(
            "material-icons-round text-xl",
            isActive ? "text-primary" : "",
          )}
        >
          {item.icon}
        </span>
        {item.label}
      </Link>
    );
  }

  return (
    <aside className="hidden h-full w-64 flex-shrink-0 flex-col border-r border-border bg-card md:flex">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-border px-6">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-white">
          <span className="material-icons-round text-lg">shopping_bag</span>
        </div>
        <span className="text-lg font-bold tracking-tight">
          Shop<span className="text-primary">AI</span>
        </span>
      </div>

      {/* Sections */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {/* Discover */}
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
          Discover
        </p>
        <div className="space-y-0.5">
          {discoverItems.map(renderNavItem)}
        </div>

        {/* Your Space */}
        <p className="mb-2 mt-6 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
          Your Space
        </p>
        <div className="space-y-0.5">
          {yourSpaceItems.map(renderNavItem)}
        </div>
      </nav>

      {/* Cart Badge */}
      {cartCount > 0 && (
        <div className="border-t border-border p-3">
          <div className="flex items-center gap-3 rounded-lg bg-primary/5 px-3 py-2.5 text-sm">
            <span className="material-icons-round text-xl text-primary">
              shopping_cart
            </span>
            <span className="font-medium">Cart</span>
            <span className="ml-auto flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
              {cartCount}
            </span>
          </div>
        </div>
      )}
    </aside>
  );
}

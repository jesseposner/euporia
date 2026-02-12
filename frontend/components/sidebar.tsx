"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCart } from "@/lib/cart-context";
import { useMerchant } from "@/lib/merchant-context";
import { UserProfileBadge } from "@/components/user-profile-badge";
import { cn } from "@/lib/utils";

const discoverItems = [
  { href: "/", label: "Dashboard", icon: "dashboard" },
  { href: "/discover", label: "Discover", icon: "explore" },
  { href: "/chat", label: "AI Concierge", icon: "smart_toy" },
];

const categoryItems = [
  { href: "/discover?cat=fashion", label: "Fashion", icon: "checkroom" },
  { href: "/discover?cat=electronics", label: "Electronics", icon: "devices" },
  { href: "/discover?cat=home", label: "Home", icon: "chair" },
  { href: "/discover?cat=sports", label: "Sports", icon: "fitness_center" },
];

const yourSpaceItems = [
  { href: "/wishlist", label: "Wishlist", icon: "favorite_border" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { cart } = useCart();
  const { merchant, setMerchant, allMerchants } = useMerchant();
  const cartCount = cart?.totalQuantity || 0;

  function handleStoreSwitch(nextMerchant: (typeof allMerchants)[number]) {
    setMerchant(nextMerchant);

    const isBrowsingPage = pathname === "/" || pathname.startsWith("/discover");
    if (!isBrowsingPage) {
      router.push("/discover");
    }
  }

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

        {/* Context-aware sidebar sections */}
        {pathname.startsWith("/discover") ? (
          <>
            <p className="mb-2 mt-6 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
              Categories
            </p>
            <div className="space-y-0.5">
              {categoryItems.map(renderNavItem)}
            </div>
          </>
        ) : pathname.startsWith("/chat") ? (
          <>
            {/* On chat: show all stores as info-only (concierge is global) */}
            <p className="mb-2 mt-6 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
              Searching All Stores
            </p>
            <div className="space-y-0.5">
              {allMerchants.map((m) => (
                <div
                  key={m.id}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-muted-foreground"
                >
                  <span className="material-icons-round text-xl">{m.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate">{m.name}</div>
                    <div className="truncate text-[10px] font-normal text-muted-foreground/60">
                      {m.category}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Your Space */}
            <p className="mb-2 mt-6 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
              Your Space
            </p>
            <div className="space-y-0.5">
              {yourSpaceItems.map(renderNavItem)}
            </div>
          </>
        ) : (
          <>
            {/* Stores (selectable on non-chat pages) */}
            <p className="mb-2 mt-6 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
              Stores
            </p>
            <div className="space-y-0.5">
              {allMerchants.map((m) => {
                const isActive = merchant.id === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleStoreSwitch(m)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
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
                      {m.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate">{m.name}</div>
                      <div className="truncate text-[10px] font-normal text-muted-foreground/60">
                        {m.category}
                      </div>
                    </div>
                    {isActive && (
                      <span className="material-icons-round text-sm text-primary">
                        check_circle
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Your Space */}
            <p className="mb-2 mt-6 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
              Your Space
            </p>
            <div className="space-y-0.5">
              {yourSpaceItems.map(renderNavItem)}
            </div>
          </>
        )}
      </nav>

      {/* User Profile */}
      <div className="border-t border-border">
        <UserProfileBadge />
      </div>

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

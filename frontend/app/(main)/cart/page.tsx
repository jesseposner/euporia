"use client";

import Link from "next/link";
import { SearchHeader } from "@/components/search-header";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart-context";

export default function CartPage() {
  const { cart, isLoading, updateItem, removeItem } = useCart();
  const lines = cart?.lines || [];
  const total = cart?.cost?.totalAmount;
  const itemCount = cart?.totalQuantity || lines.length || 0;

  return (
    <div className="flex-1 overflow-y-auto">
      <SearchHeader title="Cart" showGreeting />
      <div className="mx-auto max-w-4xl px-6 py-6">
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center gap-2 border-b border-border px-5 py-4">
            <span className="material-icons-round text-lg text-primary">
              shopping_cart
            </span>
            <span className="text-sm font-bold">Your Cart</span>
            <span className="ml-auto text-xs text-muted-foreground">
              {itemCount} item{itemCount !== 1 ? "s" : ""}
            </span>
          </div>

          {isLoading && !cart ? (
            <div className="flex items-center justify-center py-10">
              <div className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : lines.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <span className="material-icons-round mb-2 text-3xl text-muted-foreground opacity-40">
                shopping_bag
              </span>
              <p className="text-sm text-muted-foreground">Your cart is empty</p>
              <Button asChild className="mt-4">
                <Link href="/discover">Explore products</Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-3 px-4 py-4">
                {lines.map((line, i) => (
                  <div
                    key={line.id || i}
                    className="flex items-start gap-3 rounded-lg border border-border bg-background p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {line.merchandise?.product?.title ||
                          line.merchandise?.title}
                      </p>
                      {line.merchandise?.title &&
                        line.merchandise.title !== "Default Title" && (
                          <p className="text-xs text-muted-foreground">
                            {line.merchandise.title}
                          </p>
                        )}

                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={!line.id || isLoading}
                            onClick={() => {
                              const currentQty = line.quantity || 1;
                              if (!line.id) return;
                              if (currentQty <= 1) {
                                void removeItem(line.id);
                                return;
                              }
                              void updateItem(line.id, currentQty - 1);
                            }}
                            className="flex size-6 items-center justify-center rounded border border-border text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                            aria-label="Decrease quantity"
                          >
                            <span className="material-icons-round text-sm">
                              remove
                            </span>
                          </button>
                          <span className="w-6 text-center text-xs text-muted-foreground">
                            {line.quantity || 1}
                          </span>
                          <button
                            type="button"
                            disabled={!line.id || isLoading}
                            onClick={() => {
                              if (!line.id) return;
                              void updateItem(line.id, (line.quantity || 1) + 1);
                            }}
                            className="flex size-6 items-center justify-center rounded border border-border text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                            aria-label="Increase quantity"
                          >
                            <span className="material-icons-round text-sm">
                              add
                            </span>
                          </button>
                          <button
                            type="button"
                            disabled={!line.id || isLoading}
                            onClick={() => {
                              if (!line.id) return;
                              void removeItem(line.id);
                            }}
                            className="ml-2 text-xs text-muted-foreground transition-colors hover:text-destructive disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Remove
                          </button>
                        </div>

                        {line.merchandise?.price?.amount && (
                          <span className="text-sm font-semibold text-primary">
                            ${line.merchandise.price.amount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-border p-4">
                {total?.amount && (
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total</span>
                    <span className="text-lg font-bold">${total.amount}</span>
                  </div>
                )}
                {cart?.checkoutUrl ? (
                  <Button asChild className="w-full">
                    <a
                      href={cart.checkoutUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span className="material-icons-round mr-1 text-sm">
                        open_in_new
                      </span>
                      Checkout
                    </a>
                  </Button>
                ) : (
                  <Button className="w-full" disabled>
                    Checkout
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

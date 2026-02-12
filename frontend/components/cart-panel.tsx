"use client";

import { useCart } from "@/lib/cart-context";
import { Button } from "@/components/ui/button";

export function CartPanel() {
  const { cart, isLoading } = useCart();

  if (isLoading && !cart) {
    return (
      <div className="flex h-full flex-col border-l border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <span className="material-icons-round text-lg">shopping_cart</span>
          <span className="text-sm font-semibold">Cart</span>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  const lines = cart?.lines || [];
  const total = cart?.cost?.totalAmount;
  const itemCount = cart?.totalQuantity || lines.length || 0;

  return (
    <div className="flex h-full flex-col border-l border-border bg-card">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <span className="material-icons-round text-lg">shopping_cart</span>
        <span className="text-sm font-semibold">Cart</span>
        {itemCount > 0 && (
          <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
            {itemCount}
          </span>
        )}
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {lines.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <span className="material-icons-round mb-2 text-3xl text-muted-foreground opacity-40">
              shopping_bag
            </span>
            <p className="text-sm text-muted-foreground">Your cart is empty</p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              Chat with ShopAI to find products
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {lines.map((line, i) => (
              <div
                key={line.id || i}
                className="flex items-start gap-3 rounded-lg border border-border bg-background p-2.5"
              >
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium">
                    {line.merchandise?.product?.title || line.merchandise?.title}
                  </p>
                  {line.merchandise?.title &&
                    line.merchandise.title !== "Default Title" && (
                      <p className="text-xs text-muted-foreground">
                        {line.merchandise.title}
                      </p>
                    )}
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Qty: {line.quantity || 1}
                    </span>
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
        )}
      </div>

      {/* Footer */}
      {lines.length > 0 && (
        <div className="border-t border-border p-4">
          {total?.amount && (
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-lg font-bold">${total.amount}</span>
            </div>
          )}
          {cart?.checkoutUrl && (
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
          )}
        </div>
      )}
    </div>
  );
}

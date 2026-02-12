"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface StickyPurchaseBarProps {
  price?: string;
  currencyCode?: string;
  variantId?: string;
  visible: boolean;
  onAdd: (quantity: number) => void;
  disabled?: boolean;
}

export function StickyPurchaseBar({
  price,
  currencyCode,
  variantId,
  visible,
  onAdd,
  disabled,
}: StickyPurchaseBarProps) {
  const [quantity, setQuantity] = useState(1);

  if (!visible || !variantId) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
        {/* Price */}
        <div className="flex items-baseline gap-1">
          {price && (
            <>
              <span className="text-xl font-bold text-primary">${price}</span>
              {currencyCode && (
                <span className="text-xs text-muted-foreground">
                  {currencyCode}
                </span>
              )}
            </>
          )}
        </div>

        {/* Quantity Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="flex size-8 items-center justify-center rounded-lg border border-border text-sm transition-colors hover:bg-accent"
            aria-label="Decrease quantity"
          >
            <span className="material-icons-round text-base">remove</span>
          </button>
          <span className="w-8 text-center text-sm font-medium">{quantity}</span>
          <button
            onClick={() => setQuantity((q) => q + 1)}
            className="flex size-8 items-center justify-center rounded-lg border border-border text-sm transition-colors hover:bg-accent"
            aria-label="Increase quantity"
          >
            <span className="material-icons-round text-base">add</span>
          </button>
        </div>

        {/* Add to Cart */}
        <Button
          onClick={() => onAdd(quantity)}
          disabled={disabled}
          className="h-10 px-6 shadow-lg shadow-primary/20"
        >
          <span className="material-icons-round mr-1.5 text-base">
            add_shopping_cart
          </span>
          Add to Cart
        </Button>
      </div>
    </div>
  );
}

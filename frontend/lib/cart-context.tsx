"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useMerchant } from "@/lib/merchant-context";
import type { Cart } from "@/lib/shopify";

interface CartContextValue {
  cart: Cart | null;
  cartId: string | null;
  isLoading: boolean;
  addItem: (
    merchandiseId: string,
    quantity: number,
  ) => Promise<void>;
  updateItem: (lineId: string, quantity: number) => Promise<void>;
  removeItem: (lineId: string) => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextValue>({
  cart: null,
  cartId: null,
  isLoading: false,
  addItem: async () => {},
  updateItem: async () => {},
  removeItem: async () => {},
  refreshCart: async () => {},
});

export function useCart() {
  return useContext(CartContext);
}

const CART_KEY = "shopai-cart-id";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [cartId, setCartId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { merchant } = useMerchant();
  const cartStorageKey = `${CART_KEY}-${merchant.id}`;

  // Load cart ID from localStorage on mount (scoped per merchant)
  useEffect(() => {
    const stored = localStorage.getItem(cartStorageKey);
    setCartId(stored);
    if (!stored) setCart(null);
  }, [cartStorageKey]);

  const refreshCartInternal = useCallback(
    async (id: string) => {
      try {
        setIsLoading(true);
        const res = await fetch(
          `/api/cart?cartId=${encodeURIComponent(id)}&store=${encodeURIComponent(merchant.domain)}`,
        );
        if (res.ok) {
          const data = await res.json();
          setCart(data);
        } else {
          // Prevent repeated retry loops on invalid or expired carts.
          setCart(null);
          setCartId(null);
          localStorage.removeItem(cartStorageKey);
        }
      } catch {
        // Reset invalid cart IDs on network/API failures to avoid request storms.
        setCart(null);
        setCartId(null);
        localStorage.removeItem(cartStorageKey);
      } finally {
        setIsLoading(false);
      }
    },
    [cartStorageKey, merchant.domain],
  );

  // Fetch cart when cartId is available
  useEffect(() => {
    if (!cartId) return;
    refreshCartInternal(cartId);
  }, [cartId, refreshCartInternal]);

  const refreshCart = useCallback(async () => {
    if (cartId) {
      await refreshCartInternal(cartId);
    }
  }, [cartId, refreshCartInternal]);

  const addItem = useCallback(
    async (merchandiseId: string, quantity: number) => {
      setIsLoading(true);
      try {
        const res = await fetch("/api/cart", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            items: [{ merchandiseId, quantity }],
            cartId: cartId || undefined,
            store: merchant.domain,
          }),
        });
        if (res.ok) {
          const data: Cart = await res.json();
          setCart(data);
          if (data.id) {
            setCartId(data.id);
            localStorage.setItem(cartStorageKey, data.id);
          }
        }
      } finally {
        setIsLoading(false);
      }
    },
    [cartId, cartStorageKey, merchant.domain],
  );

  const updateItem = useCallback(
    async (lineId: string, quantity: number) => {
      if (!cartId) return;

      setIsLoading(true);
      try {
        const res = await fetch("/api/cart", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            cartId,
            store: merchant.domain,
            updates: [{ lineId, quantity }],
          }),
        });
        if (res.ok) {
          const data: Cart = await res.json();
          setCart(data);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [cartId, merchant.domain],
  );

  const removeItem = useCallback(
    async (lineId: string) => {
      if (!cartId) return;

      setIsLoading(true);
      try {
        const res = await fetch("/api/cart", {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            cartId,
            store: merchant.domain,
            lineIds: [lineId],
          }),
        });
        if (res.ok) {
          const data: Cart = await res.json();
          setCart(data);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [cartId, merchant.domain],
  );

  return (
    <CartContext
      value={{
        cart,
        cartId,
        isLoading,
        addItem,
        updateItem,
        removeItem,
        refreshCart,
      }}
    >
      {children}
    </CartContext>
  );
}

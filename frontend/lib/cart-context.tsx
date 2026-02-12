"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { Cart } from "@/lib/shopify";

interface CartContextValue {
  cart: Cart | null;
  cartId: string | null;
  isLoading: boolean;
  addItem: (
    merchandiseId: string,
    quantity: number,
  ) => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextValue>({
  cart: null,
  cartId: null,
  isLoading: false,
  addItem: async () => {},
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

  // Load cart ID from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(CART_KEY);
    if (stored) {
      setCartId(stored);
    }
  }, []);

  // Fetch cart when cartId is available
  useEffect(() => {
    if (!cartId) return;
    refreshCartInternal(cartId);
  }, [cartId]);

  async function refreshCartInternal(id: string) {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/cart?cartId=${encodeURIComponent(id)}`);
      if (res.ok) {
        const data = await res.json();
        setCart(data);
      }
    } catch {
      // Cart may have expired
    } finally {
      setIsLoading(false);
    }
  }

  const refreshCart = useCallback(async () => {
    if (cartId) {
      await refreshCartInternal(cartId);
    }
  }, [cartId]);

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
          }),
        });
        if (res.ok) {
          const data: Cart = await res.json();
          setCart(data);
          if (data.id) {
            setCartId(data.id);
            localStorage.setItem(CART_KEY, data.id);
          }
        }
      } finally {
        setIsLoading(false);
      }
    },
    [cartId],
  );

  return (
    <CartContext value={{ cart, cartId, isLoading, addItem, refreshCart }}>
      {children}
    </CartContext>
  );
}

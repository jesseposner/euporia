"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { type Merchant, defaultMerchant, merchants } from "@/lib/merchants";

interface MerchantContextValue {
  merchant: Merchant;
  setMerchant: (merchant: Merchant) => void;
  allMerchants: Merchant[];
}

const MerchantContext = createContext<MerchantContextValue>({
  merchant: defaultMerchant,
  setMerchant: () => {},
  allMerchants: merchants,
});

export function useMerchant() {
  return useContext(MerchantContext);
}

const MERCHANT_KEY = "shopai-merchant";

export function MerchantProvider({ children }: { children: React.ReactNode }) {
  const [merchant, setMerchantState] = useState<Merchant>(() => {
    if (typeof window === "undefined") return defaultMerchant;
    const stored = localStorage.getItem(MERCHANT_KEY);
    if (stored) {
      const found = merchants.find((m) => m.id === stored);
      if (found) return found;
    }
    return defaultMerchant;
  });

  const setMerchant = useCallback((m: Merchant) => {
    setMerchantState(m);
    localStorage.setItem(MERCHANT_KEY, m.id);
  }, []);

  return (
    <MerchantContext value={{ merchant, setMerchant, allMerchants: merchants }}>
      {children}
    </MerchantContext>
  );
}

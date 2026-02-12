"use client";

import { createContext, useContext, useState, useCallback, useSyncExternalStore } from "react";
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

function getStoredMerchantId() {
  return localStorage.getItem(MERCHANT_KEY);
}

function subscribeToStorage(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

export function MerchantProvider({ children }: { children: React.ReactNode }) {
  const storedId = useSyncExternalStore(
    subscribeToStorage,
    getStoredMerchantId,
    () => null,
  );

  const resolved = (storedId && merchants.find((m) => m.id === storedId)) || defaultMerchant;

  const [merchant, setMerchantState] = useState(resolved);

  // Keep in sync if storage changes externally
  if (merchant.id !== resolved.id) {
    setMerchantState(resolved);
  }

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

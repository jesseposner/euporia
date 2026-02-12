"use client";

import { useCallback, useEffect, useMemo } from "react";
import { create } from "zustand";
import { type Merchant, defaultMerchant, merchants } from "@/lib/merchants";

const MERCHANT_KEY = "shopai-merchant";

interface MerchantStoreState {
  merchantId: string;
  setMerchantId: (merchantId: string) => void;
}

interface MerchantContextValue {
  merchant: Merchant;
  setMerchant: (merchant: Merchant) => void;
  allMerchants: Merchant[];
}

const useMerchantStore = create<MerchantStoreState>((set) => ({
  merchantId: defaultMerchant.id,
  setMerchantId: (merchantId) => set({ merchantId }),
}));

export function useMerchant(): MerchantContextValue {
  const merchantId = useMerchantStore((state) => state.merchantId);
  const setMerchantId = useMerchantStore((state) => state.setMerchantId);

  const merchant = useMemo(
    () => merchants.find((candidate) => candidate.id === merchantId) || defaultMerchant,
    [merchantId],
  );

  const setMerchant = useCallback(
    (nextMerchant: Merchant) => setMerchantId(nextMerchant.id),
    [setMerchantId],
  );

  return {
    merchant,
    setMerchant,
    allMerchants: merchants,
  };
}

export function MerchantProvider({ children }: { children: React.ReactNode }) {
  const merchantId = useMerchantStore((state) => state.merchantId);
  const setMerchantId = useMerchantStore((state) => state.setMerchantId);

  useEffect(() => {
    const storedId = localStorage.getItem(MERCHANT_KEY);
    if (storedId && merchants.some((merchant) => merchant.id === storedId)) {
      setMerchantId(storedId);
    }
  }, [setMerchantId]);

  useEffect(() => {
    localStorage.setItem(MERCHANT_KEY, merchantId);
  }, [merchantId]);

  return children;
}

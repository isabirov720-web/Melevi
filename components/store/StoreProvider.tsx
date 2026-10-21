"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { translate, type DictKey } from "@/lib/i18n";
import { formatMoney } from "@/lib/format";
import type { CartItem, Locale } from "@/lib/types";

export interface StoreInfo {
  locale: Locale;
  currency: string;
  storeName: string;
  whatsapp: string;
  instagramUrl: string;
  orderChannels: { whatsapp: boolean; instagram: boolean };
  deliveryChargedSeparately: boolean;
  siteUrl: string;
}

interface StoreCtx extends StoreInfo {
  t: (key: DictKey, vars?: Record<string, string | number>) => string;
  money: (minor: number) => string;
  cart: CartItem[];
  cartReady: boolean;
  cartCount: number;
  addToCart: (item: CartItem, maxStock: number) => "added" | "max";
  setQty: (variantId: string, qty: number) => void;
  removeFromCart: (variantId: string) => void;
}

const Ctx = createContext<StoreCtx | null>(null);
const KEY = "melevi-cart-v1";

function readCart(): CartItem[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(raw)
      ? raw.filter((i) => typeof i?.productId === "string" && typeof i?.variantId === "string" && Number.isInteger(i?.qty) && i.qty > 0)
      : [];
  } catch {
    return [];
  }
}

export function StoreProvider({ info, children }: { info: StoreInfo; children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartReady, setReady] = useState(false);

  useEffect(() => {
    setCart(readCart());
    setReady(true);
    const onStorage = (e: StorageEvent) => e.key === KEY && setCart(readCart());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const persist = useCallback((next: CartItem[]) => {
    setCart(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // Private mode / storage full: cart still works for this visit.
    }
  }, []);

  const addToCart = useCallback(
    (item: CartItem, maxStock: number) => {
      const current = readCart();
      const existing = current.find((i) => i.variantId === item.variantId);
      const have = existing?.qty ?? 0;
      if (have >= maxStock) return "max" as const;
      const qty = Math.min(have + item.qty, maxStock);
      persist(existing ? current.map((i) => (i.variantId === item.variantId ? { ...i, qty } : i)) : [...current, { ...item, qty }]);
      return "added" as const;
    },
    [persist],
  );

  const setQty = useCallback(
    (variantId: string, qty: number) => persist(readCart().map((i) => (i.variantId === variantId ? { ...i, qty: Math.max(1, qty) } : i))),
    [persist],
  );
  const removeFromCart = useCallback((variantId: string) => persist(readCart().filter((i) => i.variantId !== variantId)), [persist]);

  const value = useMemo<StoreCtx>(
    () => ({
      ...info,
      t: (key, vars) => translate(info.locale, key, vars),
      money: (minor) => formatMoney(minor, info.currency, info.locale),
      cart,
      cartReady,
      cartCount: cart.reduce((s, i) => s + i.qty, 0),
      addToCart,
      setQty,
      removeFromCart,
    }),
    [info, cart, cartReady, addToCart, setQty, removeFromCart],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}

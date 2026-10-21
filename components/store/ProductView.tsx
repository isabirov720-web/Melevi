"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { findVariant, imageIndexForColor, isInStock, isOnSale, priceRange, resolveSelection, tr, variantPrice } from "@/lib/catalog";
import { instagramLinks, whatsappLink } from "@/lib/order";
import type { Product } from "@/lib/types";
import { Gallery } from "./Gallery";
import { useStore } from "./StoreProvider";
import { InstagramIcon, WhatsAppIcon } from "./Icons";

export function ProductView({ product: p, productUrl, children }: { product: Product; productUrl: string; children?: ReactNode }) {
  const { t, locale, money, addToCart, cart, whatsapp, instagramUrl } = useStore();
  const [colorId, setColorId] = useState<string | null>(p.colors.length === 1 ? p.colors[0].id : null);
  const [sizeId, setSizeId] = useState<string | null>(p.sizes.length === 1 ? p.sizes[0].id : null);
  const [qty, setQty] = useState(1);
  const [imgIndex, setImgIndex] = useState(() => Math.max(0, imageIndexForColor(p, colorId)));
  const [notice, setNotice] = useState<"added" | "max" | null>(null);

  const name = tr(p.name, locale);
  const sel = resolveSelection(p, colorId, sizeId);
  const variant = sel.state === "ok" ? sel.variant : null;
  const stock = variant?.stock ?? 0;
  const inCart = variant ? (cart.find((i) => i.variantId === variant.id)?.qty ?? 0) : 0;
  const maxQty = Math.max(0, stock - inCart);
  const anyStock = isInStock(p);
  const range = priceRange(p);
  const shownPrice = variant ? variantPrice(p, variant) : range.min;
  const sale = isOnSale(p) && (!variant || variant.price == null);

  const sizeAvailable = (sid: string) =>
    p.variants.some((v) => v.sizeId === sid && v.stock > 0 && (!p.colors.length || !colorId || v.colorId === colorId));
  const colorAvailable = (cid: string) =>
    p.variants.some((v) => v.colorId === cid && v.stock > 0 && (!p.sizes.length || !sizeId || v.sizeId === sizeId));

  const chooseColor = (cid: string) => {
    setColorId(cid);
    setNotice(null);
    setQty(1);
    if (sizeId && !findVariant(p, cid, sizeId)?.stock) setSizeId(null);
    const i = imageIndexForColor(p, cid);
    if (i >= 0) setImgIndex(i);
  };
  const chooseSize = (sid: string) => {
    setSizeId(sid);
    setNotice(null);
    setQty(1);
  };

  const add = () => {
    if (!variant || maxQty < 1) return;
    setNotice(addToCart({ productId: p.id, variantId: variant.id, qty: Math.min(qty, maxQty) }, stock));
    setQty(1);
  };

  let buttonLabel = t("product.add");
  if (!anyStock) buttonLabel = t("stock.out");
  else if (sel.state === "missing") buttonLabel = sel.missing === "color" ? t("product.chooseColor") : t("product.chooseSize");
  else if (sel.state === "unavailable") buttonLabel = t("product.unavailable");
  else if (maxQty < 1) buttonLabel = t("product.maxInCart");
  const canAdd = sel.state === "ok" && maxQty >= 1;

  let availability = t("stock.selectFirst");
  let availabilityClass = "";
  if (!anyStock) [availability, availabilityClass] = [t("stock.out"), "out"];
  else if (sel.state === "unavailable") [availability, availabilityClass] = [t("stock.out"), "out"];
  else if (sel.state === "ok") [availability, availabilityClass] = stock <= 3 ? [t("stock.low", { n: stock }), "low"] : [t("stock.in"), "in"];

  const askText = `${t("product.askText", { name })}\n${productUrl}`;
  const wa = whatsappLink(whatsapp, askText);
  const ig = instagramLinks(instagramUrl);
  const images = useMemo(() => p.images.map((i) => ({ id: i.id, url: i.url })), [p.images]);

  return (
    <div className="product-layout">
      <Gallery images={images} alt={name} index={Math.min(imgIndex, Math.max(0, images.length - 1))} onIndex={setImgIndex} />

      <div className="product-info">
        <div className="badges static">
          {p.isDemo && <span className="badge badge-demo">{t("badge.demo")}</span>}
          {p.isNew && <span className="badge">{t("badge.new")}</span>}
          {sale && <span className="badge badge-sale">{t("badge.sale")}</span>}
        </div>
        <h1 className="product-title">{name}</h1>
        <p className="price price-lg" aria-live="polite">
          <span className={sale ? "price-now sale" : "price-now"}>
            {!variant && range.min !== range.max ? `${t("catalog.priceFrom")} ` : ""}
            {money(shownPrice)}
          </span>
          {sale && <s className="price-was">{money(p.compareAtPrice!)}</s>}
        </p>

        {p.colors.length > 0 && (
          <fieldset className="option-group">
            <legend>
              {t("product.color")}
              {colorId && <span className="option-value">: {tr(p.colors.find((c) => c.id === colorId)?.name, locale)}</span>}
            </legend>
            <div className="option-row">
              {p.colors.map((c) => {
                const ok = colorAvailable(c.id);
                return (
                  <button key={c.id} type="button" className={`color-btn ${colorId === c.id ? "active" : ""} ${ok ? "" : "off"}`} aria-pressed={colorId === c.id} onClick={() => chooseColor(c.id)} title={tr(c.name, locale)}>
                    <span className="swatch swatch-lg" style={{ background: c.hex }} aria-hidden />
                    <span className="sr-only">{tr(c.name, locale)}{ok ? "" : ` — ${t("stock.out")}`}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        {p.sizes.length > 0 && (
          <fieldset className="option-group">
            <legend>{t("product.size")}</legend>
            <div className="option-row">
              {p.sizes.map((s) => {
                const ok = sizeAvailable(s.id);
                return (
                  <button key={s.id} type="button" className={`size-btn ${sizeId === s.id ? "active" : ""} ${ok ? "" : "off"}`} aria-pressed={sizeId === s.id} disabled={!ok} onClick={() => chooseSize(s.id)}>
                    {s.label}
                    {!ok && <span className="sr-only"> — {t("stock.out")}</span>}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        <p className={`stock ${availabilityClass}`} aria-live="polite">{availability}</p>

        <div className="buy-row">
          <div className="qty" role="group" aria-label={t("product.qty")}>
            <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={!canAdd || qty <= 1} aria-label={t("product.decrease")}>−</button>
            <output aria-live="polite">{qty}</output>
            <button type="button" onClick={() => setQty((q) => Math.min(maxQty, q + 1))} disabled={!canAdd || qty >= maxQty} aria-label={t("product.increase")}>+</button>
          </div>
          <button type="button" className="btn btn-dark btn-block" onClick={add} disabled={!canAdd}>{buttonLabel}</button>
        </div>
        <div aria-live="polite" className="add-notice">
          {notice === "added" && (
            <p className="notice-ok">{t("product.added")} · <Link href="/cart">{t("product.goCart")}</Link></p>
          )}
          {notice === "max" && <p className="notice-warn">{t("product.maxInCart")}</p>}
        </div>

        {(wa || ig) && (
          <a className="btn btn-outline btn-block" href={wa ?? ig!.dm} target="_blank" rel="noopener noreferrer">
            {wa ? <WhatsAppIcon width={18} height={18} /> : <InstagramIcon width={18} height={18} />} {t("product.ask")}
          </a>
        )}
        {children}
      </div>
    </div>
  );
}

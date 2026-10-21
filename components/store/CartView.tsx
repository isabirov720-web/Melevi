"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { tr } from "@/lib/catalog";
import { buildOrderText, cartTotal, instagramLinks, whatsappLink } from "@/lib/order";
import type { ResolvedCartLine } from "@/lib/types";
import { Img } from "./Img";
import { useStore } from "./StoreProvider";
import { CopyIcon, InstagramIcon, WhatsAppIcon } from "./Icons";

export function CartView() {
  const store = useStore();
  const { t, locale, money, cart, cartReady, setQty, removeFromCart } = store;
  const [resolved, setResolved] = useState<ResolvedCartLine[] | null>(null);
  const [error, setError] = useState(false);
  const [comment, setComment] = useState("");
  const [copyState, setCopyState] = useState<"copied" | "failed" | null>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const idsKey = cart.map((i) => i.variantId).sort().join(",");

  // Ask the server for current prices and stock whenever the set of items changes.
  useEffect(() => {
    if (!cartReady) return;
    if (!cart.length) {
      setResolved([]);
      return;
    }
    let cancelled = false;
    setError(false);
    fetch("/api/cart", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ items: cart }) })
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((data: { lines: ResolvedCartLine[] }) => {
        if (cancelled) return;
        setResolved(data.lines);
        const known = new Set(data.lines.map((l) => l.variantId));
        cart.filter((i) => !known.has(i.variantId)).forEach((i) => removeFromCart(i.variantId));
      })
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartReady, idsKey]);

  // Current quantities come from the cart; prices and stock from the server.
  const lines = useMemo(() => {
    if (!resolved) return [];
    return resolved
      .map((l) => {
        const item = cart.find((i) => i.variantId === l.variantId);
        return item ? { ...l, qty: l.available ? Math.min(item.qty, l.stock) : item.qty, wanted: item.qty } : null;
      })
      .filter((l): l is ResolvedCartLine & { wanted: number } => !!l);
  }, [resolved, cart]);

  const total = cartTotal(lines);
  const orderable = lines.filter((l) => l.available);
  const text = buildOrderText({
    lines,
    locale,
    currency: store.currency,
    storeName: store.storeName,
    siteUrl: store.siteUrl,
    deliveryChargedSeparately: store.deliveryChargedSeparately,
    comment,
  });
  const wa = store.orderChannels.whatsapp ? whatsappLink(store.whatsapp, text) : null;
  const ig = store.orderChannels.instagram ? instagramLinks(store.instagramUrl) : null;

  const copy = () => {
    const done = (ok: boolean) => {
      setCopyState(ok ? "copied" : "failed");
      if (!ok) textRef.current?.select();
    };
    try {
      navigator.clipboard.writeText(text).then(() => done(true), () => done(false));
    } catch {
      done(false);
    }
  };

  if (!cartReady || (cart.length > 0 && !resolved && !error)) {
    return <p className="muted loading" role="status">{t("cart.loading")}</p>;
  }
  if (error) {
    return <div className="empty-state" role="alert"><p>{t("cart.error")}</p></div>;
  }
  if (!lines.length) {
    return (
      <div className="empty-state">
        <h2 className="section-title">{t("cart.empty")}</h2>
        <p className="muted">{t("cart.emptyText")}</p>
        <Link href="/catalog" className="btn btn-dark">{t("cart.continue")}</Link>
      </div>
    );
  }

  return (
    <div className="cart-layout">
      <ul className="cart-lines">
        {lines.map((l) => {
          const name = tr(l.name, locale);
          return (
            <li key={l.variantId} className={`cart-line ${l.available ? "" : "is-unavailable"}`}>
              <Link href={`/product/${l.slug}`} className="cart-thumb" tabIndex={-1} aria-hidden>
                {l.image && <Img src={l.image} alt="" fill sizes="96px" />}
              </Link>
              <div className="cart-line-body">
                <Link href={`/product/${l.slug}`} className="cart-name">{name}</Link>
                <p className="muted small">
                  {[l.color && `${t("product.color")}: ${tr(l.color, locale)}`, l.size && `${t("product.size")}: ${l.size}`].filter(Boolean).join(" · ")}
                </p>
                <p className="small">{money(l.unitPrice)}</p>
                {!l.available && <p className="notice-warn small">{t("cart.unavailableLine")}</p>}
                {l.available && l.wanted > l.stock && <p className="notice-warn small">{t("cart.reduced", { n: l.stock })}</p>}
                <div className="cart-line-actions">
                  {l.available && (
                    <div className="qty qty-sm" role="group" aria-label={`${t("product.qty")}: ${name}`}>
                      <button type="button" onClick={() => setQty(l.variantId, l.qty - 1)} disabled={l.qty <= 1} aria-label={t("product.decrease")}>−</button>
                      <output>{l.qty}</output>
                      <button type="button" onClick={() => setQty(l.variantId, Math.min(l.stock, l.qty + 1))} disabled={l.qty >= l.stock} aria-label={t("product.increase")}>+</button>
                    </div>
                  )}
                  <button type="button" className="link-btn" onClick={() => removeFromCart(l.variantId)}>{t("cart.remove")}</button>
                </div>
              </div>
              <p className="cart-line-total">{l.available ? money(l.unitPrice * l.qty) : "—"}</p>
            </li>
          );
        })}
      </ul>

      <aside className="cart-summary" aria-labelledby="h-request">
        <h2 id="h-request" className="summary-title">{t("cart.request")}</h2>
        <p className="muted small">{t("cart.items", { n: orderable.reduce((s, l) => s + l.qty, 0) })}</p>
        <div className="summary-total">
          <span>{t("cart.total")}</span>
          <strong>{money(total)}</strong>
        </div>
        <p className="small muted">{store.deliveryChargedSeparately ? t("cart.deliverySeparate") : t("cart.deliveryConfirm")}</p>
        <p className="info-box small">{t("cart.requestInfo")}</p>

        <label className="field">
          <span>{t("cart.comment")}</span>
          <textarea value={comment} onChange={(e) => setComment(e.target.value.slice(0, 500))} rows={2} placeholder={t("cart.commentPh")} />
        </label>

        {orderable.length > 0 && (
          <div className="summary-actions">
            {wa && (
              <>
                <a className="btn btn-dark btn-block" href={wa} target="_blank" rel="noopener noreferrer">
                  <WhatsAppIcon width={18} height={18} /> {t("cart.whatsapp")}
                </a>
                <p className="hint">{t("cart.whatsappHint")}</p>
              </>
            )}
            {ig && (
              <>
                <a className={`btn btn-block ${wa ? "btn-outline" : "btn-dark"}`} href={ig.dm} target="_blank" rel="noopener noreferrer" onClick={copy}>
                  <InstagramIcon width={18} height={18} /> {t("cart.instagram")}
                </a>
                <p className="hint">{t("cart.instagramHint")}</p>
              </>
            )}
            {!wa && !ig && <p className="notice-warn small">{t("cart.noChannels")}</p>}
            <button type="button" className="btn btn-ghost btn-block" onClick={copy}><CopyIcon width={18} height={18} /> {t("cart.copy")}</button>
            <p role="status" className="small">
              {copyState === "copied" && <span className="notice-ok">{t("cart.copied")}</span>}
              {copyState === "failed" && <span className="notice-warn">{t("cart.copyFailed")}</span>}
            </p>
          </div>
        )}

        <details className="accordion" open={copyState === "failed"}>
          <summary>{t("cart.preview")}</summary>
          <textarea ref={textRef} className="order-text" readOnly value={text} rows={10} aria-label={t("cart.preview")} />
        </details>
      </aside>
    </div>
  );
}

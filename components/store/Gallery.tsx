"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Img } from "./Img";
import { useStore } from "./StoreProvider";
import { ChevronLeft, ChevronRight, CloseIcon, ZoomIcon } from "./Icons";

export function Gallery({ images, alt, index, onIndex }: { images: { id: string; url: string }[]; alt: string; index: number; onIndex: (i: number) => void }) {
  const { t } = useStore();
  const trackRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const programmatic = useRef(false);
  const [zoomIndex, setZoomIndex] = useState(0);
  const total = images.length;

  // Keep the swipeable track in sync when the index changes (thumbnail click, color change).
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const target = index * el.clientWidth;
    if (Math.abs(el.scrollLeft - target) > 4) {
      programmatic.current = true;
      el.scrollTo({ left: target, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      window.setTimeout(() => (programmatic.current = false), 450);
    }
  }, [index]);

  const onScroll = () => {
    const el = trackRef.current;
    if (!el || programmatic.current) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== index) onIndex(i);
  };

  const open = (i: number) => {
    setZoomIndex(i);
    dialogRef.current?.showModal();
  };
  const step = useCallback((d: number) => setZoomIndex((i) => (i + d + total) % total), [total]);

  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    const onKey = (e: KeyboardEvent) => {
      if (!dlg.open) return;
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step]);

  if (!total) return <div className="gallery-empty" aria-hidden />;

  return (
    <div className="gallery">
      <div className="gallery-stage">
        <div className="gallery-track" ref={trackRef} onScroll={onScroll}>
          {images.map((img, i) => (
            <button key={img.id} type="button" className="gallery-slide" onClick={() => open(i)} aria-label={`${t("product.zoom")} — ${t("product.photo", { n: i + 1, total })}`}>
              <Img src={img.url} alt={i === 0 ? alt : `${alt} — ${i + 1}`} fill priority={i === 0} sizes="(max-width: 900px) 100vw, 55vw" className="gallery-img" />
            </button>
          ))}
        </div>
        <span className="gallery-zoom-hint" aria-hidden><ZoomIcon width={18} height={18} /></span>
        {total > 1 && (
          <>
            <button type="button" className="gallery-nav prev" onClick={() => onIndex((index - 1 + total) % total)} aria-label={t("product.prev")}><ChevronLeft /></button>
            <button type="button" className="gallery-nav next" onClick={() => onIndex((index + 1) % total)} aria-label={t("product.next")}><ChevronRight /></button>
            <div className="gallery-dots" aria-hidden>
              {images.map((img, i) => <span key={img.id} className={i === index ? "active" : ""} />)}
            </div>
          </>
        )}
      </div>
      {total > 1 && (
        <div className="gallery-thumbs">
          {images.map((img, i) => (
            <button key={img.id} type="button" className={`thumb ${i === index ? "active" : ""}`} onClick={() => onIndex(i)} aria-label={t("product.photo", { n: i + 1, total })} aria-current={i === index}>
              <Img src={img.url} alt="" fill sizes="80px" />
            </button>
          ))}
        </div>
      )}

      <dialog ref={dialogRef} className="lightbox" aria-label={alt} onClick={(e) => e.target === dialogRef.current && dialogRef.current?.close()}>
        <div className="lightbox-inner">
          <Img src={images[zoomIndex]?.url ?? images[0].url} alt={`${alt} — ${zoomIndex + 1}`} fill sizes="100vw" className="lightbox-img" />
          <p className="lightbox-count">{t("product.photo", { n: zoomIndex + 1, total })}</p>
          <button type="button" className="lightbox-close icon-btn" onClick={() => dialogRef.current?.close()} aria-label={t("nav.close")} autoFocus><CloseIcon /></button>
          {total > 1 && (
            <>
              <button type="button" className="gallery-nav prev" onClick={() => step(-1)} aria-label={t("product.prev")}><ChevronLeft /></button>
              <button type="button" className="gallery-nav next" onClick={() => step(1)} aria-label={t("product.next")}><ChevronRight /></button>
            </>
          )}
        </div>
      </dialog>
    </div>
  );
}

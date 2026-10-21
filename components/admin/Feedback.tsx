"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

type Toast = { id: number; kind: "ok" | "error"; text: string };
type ConfirmOpts = { title: string; text?: string; confirmLabel?: string };

const Ctx = createContext<{
  toast: (kind: Toast["kind"], text: string) => void;
  confirm: (opts: ConfirmOpts) => Promise<boolean>;
} | null>(null);

/** Success/error messages and a confirmation dialog for destructive actions. */
export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [pending, setPending] = useState<ConfirmOpts | null>(null);
  const resolver = useRef<(v: boolean) => void>(undefined);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const toast = useCallback((kind: Toast["kind"], text: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, kind, text }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === "ok" ? 4000 : 9000);
  }, []);

  const confirm = useCallback((opts: ConfirmOpts) => {
    setPending(opts);
    requestAnimationFrame(() => dialogRef.current?.showModal());
    return new Promise<boolean>((resolve) => (resolver.current = resolve));
  }, []);

  const close = (v: boolean) => {
    dialogRef.current?.close();
    resolver.current?.(v);
    setPending(null);
  };

  return (
    <Ctx.Provider value={{ toast, confirm }}>
      {children}
      <div className="toasts" aria-live="polite" role="status">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.kind}`} role={t.kind === "error" ? "alert" : undefined}>
            <span aria-hidden>{t.kind === "ok" ? "✓" : "!"}</span> {t.text}
            <button type="button" aria-label="Закрыть" onClick={() => setToasts((all) => all.filter((x) => x.id !== t.id))}>×</button>
          </div>
        ))}
      </div>
      <dialog ref={dialogRef} className="confirm-dialog" onCancel={() => close(false)} aria-labelledby="confirm-title">
        {pending && (
          <>
            <h2 id="confirm-title">{pending.title}</h2>
            {pending.text && <p>{pending.text}</p>}
            <div className="confirm-actions">
              <button type="button" className="a-btn" onClick={() => close(false)} autoFocus>Отмена</button>
              <button type="button" className="a-btn a-btn-danger" onClick={() => close(true)}>{pending.confirmLabel ?? "Удалить"}</button>
            </div>
          </>
        )}
      </dialog>
    </Ctx.Provider>
  );
}

export function useFeedback() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useFeedback must be used inside FeedbackProvider");
  return ctx;
}

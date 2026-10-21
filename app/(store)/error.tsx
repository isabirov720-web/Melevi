"use client";

import { useStore } from "@/components/store/StoreProvider";

export default function StoreError({ reset }: { error: Error; reset: () => void }) {
  const { t } = useStore();
  return (
    <div className="container page empty-state" role="alert">
      <h1 className="page-title">{t("error.title")}</h1>
      <p className="muted">{t("error.text")}</p>
      <button type="button" className="btn btn-dark" onClick={reset}>{t("error.retry")}</button>
    </div>
  );
}

import Link from "next/link";
import { getT } from "@/lib/store-server";

export default async function NotFound() {
  const { t } = await getT().catch(() => ({ t: (k: string) => ({ "notFound.title": "Страница не найдена", "notFound.text": "", "notFound.back": "В каталог" })[k] ?? k }));
  return (
    <div className="container page empty-state not-found">
      <p className="eyebrow">404</p>
      <h1 className="page-title">{t("notFound.title")}</h1>
      <p className="muted">{t("notFound.text")}</p>
      <Link href="/catalog" className="btn btn-dark">{t("notFound.back")}</Link>
    </div>
  );
}

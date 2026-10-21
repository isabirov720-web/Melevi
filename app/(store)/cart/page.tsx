import type { Metadata } from "next";
import { getT } from "@/lib/store-server";
import { CartView } from "@/components/store/CartView";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("cart.title"), robots: { index: false } };
}

export default async function CartPage() {
  const { t } = await getT();
  return (
    <div className="container page">
      <h1 className="page-title">{t("cart.title")}</h1>
      <CartView />
    </div>
  );
}

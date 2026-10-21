import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/auth";
import { AdminNav } from "@/components/admin/AdminNav";
import { FeedbackProvider } from "@/components/admin/Feedback";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: ReactNode }) {
  const { repo, email } = await requireAdmin();
  const products = await repo.listProducts();
  const demoCount = products.filter((p) => p.isDemo).length;
  return (
    <FeedbackProvider>
      <AdminNav email={email} />
      <div className="a-main">
        {repo.mode === "local" && (
          <p className="a-banner a-banner-info">
            <strong>Локальный режим.</strong> Данные сохраняются на этом сервере, но не в облачной базе. Для настоящего сайта подключите Supabase (см. README).
          </p>
        )}
        {demoCount > 0 && (
          <p className="a-banner a-banner-warn">
            На сайте {demoCount} демо-товаров (с пометкой «Демо»). Удалите их перед запуском: <a href="/admin/backup">Резервная копия → Удалить демо-данные</a>.
          </p>
        )}
        {children}
      </div>
    </FeedbackProvider>
  );
}

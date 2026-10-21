import { requireAdmin } from "@/lib/auth";
import { SettingsForm } from "@/components/admin/SettingsForm";

export const metadata = { title: "Настройки сайта" };

export default async function SettingsPage() {
  const { repo } = await requireAdmin();
  const settings = await repo.getSettings();
  return (
    <>
      <div className="a-head"><h1>Сайт и оформление</h1></div>
      <SettingsForm key={JSON.stringify(settings)} settings={settings} />
    </>
  );
}

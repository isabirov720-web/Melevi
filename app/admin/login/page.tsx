import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/auth";
import { backendMode } from "@/lib/repo";
import { LoginForm } from "@/components/admin/LoginForm";

export const metadata = { title: "Вход" };

export default async function LoginPage() {
  if (await getAdmin()) redirect("/admin/products");
  const mode = backendMode();
  return (
    <div className="login-wrap">
      <div className="login-card">
        <p className="login-logo">MELEVI</p>
        <h1>Вход для владельца</h1>
        <LoginForm needsEmail={mode === "supabase"} />
        {mode === "local" && (
          <p className="a-hint">Локальный режим: пароль задаётся в файле <code>.env.local</code> (ADMIN_PASSWORD).</p>
        )}
      </div>
    </div>
  );
}

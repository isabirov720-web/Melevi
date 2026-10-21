"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "./client";

export function LoginForm({ needsEmail }: { needsEmail: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await api("/api/admin/login", "POST", { email, password });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    router.replace("/admin/products");
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="a-stack">
      {needsEmail && (
        <label className="a-field">
          <span className="a-label">Email</span>
          <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
      )}
      <label className="a-field">
        <span className="a-label">Пароль</span>
        <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>
      {error && <p className="a-error" role="alert">{error}</p>}
      <button className="a-btn a-btn-primary a-btn-block" disabled={busy}>{busy ? "Входим…" : "Войти"}</button>
    </form>
  );
}

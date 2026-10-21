"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api } from "./client";

const LINKS = [
  { href: "/admin/products", label: "Товары", icon: "▦" },
  { href: "/admin/categories", label: "Категории", icon: "☰" },
  { href: "/admin/settings", label: "Сайт", icon: "✎" },
  { href: "/admin/backup", label: "Копия", icon: "⤓" },
];

export function AdminNav({ email }: { email: string | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const logout = async () => {
    await api("/api/admin/logout", "POST");
    router.replace("/admin/login");
    router.refresh();
  };
  return (
    <>
      <header className="a-top">
        <Link href="/admin/products" className="a-brand">MELEVI <span>админ</span></Link>
        <nav className="a-nav-desktop" aria-label="Разделы">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} aria-current={pathname.startsWith(l.href) ? "page" : undefined}>{l.label}</Link>
          ))}
        </nav>
        <div className="a-top-actions">
          <a href="/" target="_blank" rel="noopener" className="a-btn a-btn-sm">Открыть сайт ↗</a>
          <button type="button" className="a-btn a-btn-sm a-btn-ghost" onClick={logout} title={email ?? undefined}>Выйти</button>
        </div>
      </header>
      <nav className="a-tabbar" aria-label="Разделы">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} aria-current={pathname.startsWith(l.href) ? "page" : undefined}>
            <span aria-hidden>{l.icon}</span>
            {l.label}
          </Link>
        ))}
      </nav>
    </>
  );
}

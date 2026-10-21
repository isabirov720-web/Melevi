import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./admin.css";

export const metadata: Metadata = { title: { default: "Админ-панель", template: "%s — Админ-панель" }, robots: { index: false, follow: false } };

export default function AdminRoot({ children }: { children: ReactNode }) {
  return <div className="admin" lang="ru">{children}</div>;
}

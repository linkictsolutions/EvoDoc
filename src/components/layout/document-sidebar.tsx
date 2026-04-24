"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const items = [
  {
    href: "/app/documents/commercial-invoice-icc",
    label: "Commercial Invoice (ICC)",
    code: "CI",
    hint: "Preview template output.",
    status: "ready",
  },
];

export function DocumentSidebar() {
  const pathname = usePathname();

  return (
    <aside className="input-sidebar module-sidebar card">
      <h3>Document Category</h3>
      <p className="sidebar-subtitle">Preview generated output from current resolved data.</p>
      <nav className="sidebar-nav">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={clsx("module-sidebar-link", pathname === item.href && "active")}
          >
            <span className="module-sidebar-code">{item.code}</span>
            <span className="module-sidebar-copy">
              <strong>{item.label}</strong>
              <small>{item.hint}</small>
            </span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}

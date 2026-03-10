"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const items = [
  { href: "/app/documents/commercial-invoice-icc", label: "Commercial Invoice (ICC)", status: "ready" },
];

export function DocumentSidebar() {
  const pathname = usePathname();

  return (
    <aside className="input-sidebar card">
      <h3>Document Category</h3>
      <p className="sidebar-subtitle">Preview output sheets from resolved data.</p>
      <nav className="sidebar-nav">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={clsx("sidebar-link", pathname === item.href && "active")}
          >
            <span>{item.label}</span>
            <small>{item.status === "ready" ? "Current" : "Next"}</small>
          </Link>
        ))}
      </nav>
    </aside>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const items = [
  {
    href: "/app/input/contract",
    label: "Contract",
    code: "C",
    hint: "Main commercial sheet values.",
    status: "ready",
  },
  {
    href: "/app/input/shipping-instruction",
    label: "Shipping Instruction",
    code: "SI",
    hint: "Shipment route and party details.",
    status: "ready",
  },
  {
    href: "/app/input/bank-lc",
    label: "Bank & LC",
    code: "LC",
    hint: "Banking and letter-of-credit fields.",
    status: "ready",
  },
  {
    href: "/app/input/contract-si-lc",
    label: "Resolved Values",
    code: "RV",
    hint: "Final precedence output view.",
    status: "ready",
  },
];

export function InputSidebar() {
  const pathname = usePathname();

  return (
    <aside className="input-sidebar module-sidebar card">
      <h3>Input Category</h3>
      <p className="sidebar-subtitle">Capture data in source-sheet order.</p>
      <nav className="sidebar-nav">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={clsx("module-sidebar-link", pathname === item.href && "active", item.status === "pending" && "muted")}
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

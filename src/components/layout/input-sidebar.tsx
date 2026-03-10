"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const items = [
  { href: "/app/input/contract", label: "Contract", status: "ready" },
  { href: "/app/input/shipping-instruction", label: "Shipping Instruction", status: "ready" },
  { href: "/app/input/bank-lc", label: "Bank & LC", status: "ready" },
  { href: "/app/input/contract-si-lc", label: "Contract-SI-LC Report", status: "ready" },
];

export function InputSidebar() {
  const pathname = usePathname();

  return (
    <aside className="input-sidebar card">
      <h3>Input Category</h3>
      <p className="sidebar-subtitle">Capture data in source-sheet order.</p>
      <nav className="sidebar-nav">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={clsx("sidebar-link", pathname === item.href && "active", item.status === "pending" && "muted")}
          >
            <span>{item.label}</span>
            <small>{item.status === "ready" ? "Current" : "Next"}</small>
          </Link>
        ))}
      </nav>
    </aside>
  );
}

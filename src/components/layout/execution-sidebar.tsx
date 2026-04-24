"use client";

import Link from "next/link";
import clsx from "clsx";
import { usePathname } from "next/navigation";

const items = [
  { href: "bookings", label: "Bookings", code: "BK", hint: "Vehicle pairs, containers, and seals." },
  { href: "staffing", label: "Staffing", code: "ST", hint: "Weights, certs, and final staffing rows." },
  { href: "processing", label: "Processing", code: "PR", hint: "Station and moisture inputs." },
];

export function ExecutionSidebar({ contractId }: { contractId: string }) {
  const pathname = usePathname();

  return (
    <aside className="card module-sidebar input-sidebar">
      <h3>Execution Data</h3>
      <p className="sidebar-subtitle">Operational data used by invoices, packing lists, and shipping documents.</p>
      <nav className="sidebar-nav">
        {items.map((item) => {
          const href = `/app/contracts/${contractId}/execution/${item.href}`;
          const active = pathname === href;
          return (
            <Link key={item.href} href={href} className={clsx("module-sidebar-link", active && "active")}>
              <span className="module-sidebar-code">{item.code}</span>
              <span className="module-sidebar-copy">
                <strong>{item.label}</strong>
                <small>{item.hint}</small>
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

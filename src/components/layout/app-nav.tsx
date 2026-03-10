"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const navItems = [
  { href: "/app/contracts", label: "Contracts" },
  { href: "/app/input/contract", label: "Input" },
  { href: "/app/documents/commercial-invoice-icc", label: "Documents" },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="top-nav">
      <h1>EvoDoc</h1>
      <div className="nav-links">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} className={clsx("nav-link", pathname.startsWith(item.href) && "active")}>
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

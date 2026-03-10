"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

interface ContractEditSidebarProps {
  contractId: string;
}

export function ContractEditSidebar({ contractId }: ContractEditSidebarProps) {
  const pathname = usePathname();
  const items = [
    { href: `/app/contracts/${contractId}/inputs/contract`, label: "Contract" },
    { href: `/app/contracts/${contractId}/inputs/shipping-instruction`, label: "Shipping Instruction" },
    { href: `/app/contracts/${contractId}/inputs/bank-lc`, label: "Bank & LC" },
    { href: `/app/contracts/${contractId}/inputs/contract-si-lc`, label: "Contract-SI-LC" },
  ];

  return (
    <aside className="input-sidebar card">
      <h3>Contract Inputs</h3>
      <p className="sidebar-subtitle">Edit source sheets for this contract.</p>
      <nav className="sidebar-nav">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={clsx("sidebar-link", pathname === item.href && "active")}
          >
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}

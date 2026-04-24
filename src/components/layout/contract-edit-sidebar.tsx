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
    {
      href: `/app/contracts/${contractId}/inputs/contract`,
      label: "Contract",
      code: "C",
      hint: "Core terms and commercial values.",
    },
    {
      href: `/app/contracts/${contractId}/inputs/shipping-instruction`,
      label: "Shipping Instruction",
      code: "SI",
      hint: "Carrier route and consignee details.",
    },
    {
      href: `/app/contracts/${contractId}/inputs/bank-lc`,
      label: "Bank & LC",
      code: "LC",
      hint: "Letter of credit and bank information.",
    },
    {
      href: `/app/contracts/${contractId}/inputs/contract-si-lc`,
      label: "Resolved Values",
      code: "RV",
      hint: "Precedence result across all inputs.",
    },
  ];

  return (
    <aside className="module-sidebar card input-sidebar">
      <h3>Contract Source Documents</h3>
      <p className="sidebar-subtitle">Edit each source document in process order.</p>
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

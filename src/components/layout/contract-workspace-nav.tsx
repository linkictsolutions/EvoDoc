"use client";

import Link from "next/link";
import clsx from "clsx";
import { usePathname } from "next/navigation";

interface ContractWorkspaceNavProps {
  contractId: string;
}

const tabs = [
  {
    key: "overview",
    label: "Overview",
    hint: "Contract snapshot and next actions.",
    href: (id: string) => `/app/contracts/${id}`,
  },
  {
    key: "inputs",
    label: "Inputs",
    hint: "Contract, shipping instruction, and bank LC sources.",
    href: (id: string) => `/app/contracts/${id}/inputs`,
  },
  {
    key: "resolved",
    label: "Resolved Values",
    hint: "Final precedence layer from contract, SI, and LC.",
    href: (id: string) => `/app/contracts/${id}/resolved-values`,
  },
  {
    key: "execution",
    label: "Execution",
    hint: "Bookings, staffing, and processing details.",
    href: (id: string) => `/app/contracts/${id}/execution`,
  },
  {
    key: "documents",
    label: "Documents",
    hint: "Generate revisions and review output history.",
    href: (id: string) => `/app/contracts/${id}/documents`,
  },
  {
    key: "activity",
    label: "Activity",
    hint: "Audit trail and workflow events.",
    href: (id: string) => `/app/contracts/${id}/activity`,
  },
];

function activeKey(pathname: string, contractId: string): string {
  const base = `/app/contracts/${contractId}`;

  if (pathname === base) {
    return "overview";
  }

  if (pathname.startsWith(`${base}/inputs`)) {
    return "inputs";
  }

  if (pathname.startsWith(`${base}/resolved-values`)) {
    return "resolved";
  }

  if (pathname.startsWith(`${base}/execution`) || pathname.startsWith(`${base}/shipments`)) {
    return "execution";
  }

  if (pathname.startsWith(`${base}/documents`)) {
    return "documents";
  }

  if (pathname.startsWith(`${base}/activity`)) {
    return "activity";
  }

  return "overview";
}

export function ContractWorkspaceNav({ contractId }: ContractWorkspaceNavProps) {
  const pathname = usePathname();
  const current = activeKey(pathname, contractId);

  return (
    <aside className="workspace-sidebar card">
      <h3>Contract Workspace</h3>
      <p className="sidebar-subtitle">Navigate every stage of the contract lifecycle.</p>
      <nav className="workspace-sidebar-nav">
        {tabs.map((tab, index) => (
          <Link
            key={tab.key}
            href={tab.href(contractId)}
            className={clsx("workspace-sidebar-link", current === tab.key && "active")}
          >
            <span className="workspace-sidebar-index">{index + 1}</span>
            <span className="workspace-sidebar-copy">
              <strong>{tab.label}</strong>
              <small>{tab.hint}</small>
            </span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}

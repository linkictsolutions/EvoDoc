"use client";

import Link from "next/link";
import clsx from "clsx";
import { usePathname } from "next/navigation";

interface ContractWorkspaceNavProps {
  contractId: string;
}

const tabs = [
  { key: "overview", label: "Overview", href: (id: string) => `/app/contracts/${id}` },
  { key: "inputs", label: "Inputs", href: (id: string) => `/app/contracts/${id}/inputs` },
  { key: "resolved", label: "Resolved Values", href: (id: string) => `/app/contracts/${id}/resolved-values` },
  { key: "shipments", label: "Shipments", href: (id: string) => `/app/contracts/${id}/shipments` },
  { key: "documents", label: "Documents", href: (id: string) => `/app/contracts/${id}/documents` },
  { key: "activity", label: "Activity", href: (id: string) => `/app/contracts/${id}/activity` },
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

  if (pathname.startsWith(`${base}/shipments`)) {
    return "shipments";
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
    <nav className="workspace-tabs">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href(contractId)}
          className={clsx("workspace-tab", current === tab.key && "active")}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

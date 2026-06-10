"use client";

import Link from "next/link";
import clsx from "clsx";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

interface ContractWorkspaceNavProps {
  contractId: string;
}

type SubnavItem = {
  href: string;
  label: string;
  code: string;
  hint: string;
  matchPrefix?: string;
};

const tabs = [
  {
    key: "overview",
    label: "Overview",
    hint: "Contract snapshot and next actions.",
    href: (id: string) => `/app/contracts/${id}`,
  },
  {
    key: "inputs",
    label: "Source Documents",
    hint: "Contract, shipping, bank & LC, and MSC B/L inputs.",
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

function isActivePath(pathname: string, href: string, matchPrefix = href): boolean {
  return pathname === href || pathname.startsWith(`${matchPrefix}/`);
}

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

function ContractSubnav({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  items: SubnavItem[];
}) {
  const pathname = usePathname();

  return (
    <section className="workspace-subnav card">
      <div>
        <h3>{title}</h3>
        <p className="sidebar-subtitle">{subtitle}</p>
      </div>
      <nav className="workspace-subnav-links" aria-label={title}>
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={clsx("workspace-tab", isActivePath(pathname, item.href, item.matchPrefix) && "active")}
          >
            <span className="workspace-tab-code">{item.code}</span>
            <span>
              <strong>{item.label}</strong>
              <small>{item.hint}</small>
            </span>
          </Link>
        ))}
      </nav>
    </section>
  );
}

export function ContractWorkspaceFrame({
  contractId,
  children,
}: {
  contractId: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const isPrintView = pathname.startsWith(`/app/contracts/${contractId}/documents/generated/`)
    && pathname.endsWith("/print");

  if (isPrintView) {
    return children;
  }

  return (
    <div className="workspace-shell">
      <ContractWorkspaceNav contractId={contractId} />
      <div className="workspace-content">{children}</div>
    </div>
  );
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

export function SourceDocumentsSubnav({ contractId }: ContractWorkspaceNavProps) {
  const base = `/app/contracts/${contractId}`;

  return (
    <ContractSubnav
      title="Source Documents"
      subtitle="Capture source data in the order it is received, then review final resolved values."
      items={[
        {
          href: `${base}/inputs/contract`,
          label: "Contract",
          code: "CT",
          hint: "Commercial terms and pricing.",
        },
        {
          href: `${base}/inputs/shipping-instruction`,
          label: "Shipping Instruction",
          code: "SI",
          hint: "Route, parties, and shipping conditions.",
        },
        {
          href: `${base}/inputs/bank-lc`,
          label: "Bank & LC",
          code: "LC",
          hint: "Letter-of-credit and bank details.",
        },
        {
          href: `${base}/inputs/bill-of-lading`,
          label: "MSC Bill of Lading",
          code: "BL",
          hint: "Carrier B/L details and rider overrides.",
        },
        {
          href: `${base}/resolved-values`,
          label: "Resolved Values",
          code: "RV",
          hint: "Final precedence output across source inputs.",
        },
      ]}
    />
  );
}

export function ExecutionSubnav({ contractId }: ContractWorkspaceNavProps) {
  const base = `/app/contracts/${contractId}`;

  return (
    <ContractSubnav
      title="Execution"
      subtitle="Attach operational shipment data used by generated documents."
      items={[
        {
          href: `${base}/execution/bookings`,
          label: "Bookings",
          code: "BK",
          hint: "Containers, seals, and booking references.",
        },
        {
          href: `${base}/execution/staffing`,
          label: "Staffing",
          code: "ST",
          hint: "Weights, certificates, vehicles, and drivers.",
        },
        {
          href: `${base}/execution/processing`,
          label: "Processing",
          code: "PR",
          hint: "Station and moisture inputs.",
        },
      ]}
    />
  );
}

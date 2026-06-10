"use client";

import Link from "next/link";
import clsx from "clsx";
import { usePathname } from "next/navigation";

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

function isActivePath(pathname: string, href: string, matchPrefix = href): boolean {
  return pathname === href || pathname.startsWith(`${matchPrefix}/`);
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

export function SourceDocumentsSubnav({ contractId }: ContractWorkspaceNavProps) {
  const base = `/app/contracts/${contractId}`;

  return (
    <ContractSubnav
      title="Source Documents"
      subtitle="Capture source data in the order it is received."
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

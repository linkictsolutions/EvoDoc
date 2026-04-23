"use client";

import Link from "next/link";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type NavItem = {
  href: string;
  label: string;
  description: string;
  short: string;
  matchPrefix: string;
  exact?: boolean;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const sections: NavSection[] = [
  {
    title: "Operations",
    items: [
      {
        href: "/app",
        label: "Overview",
        description: "Workspace summary and next steps.",
        short: "OV",
        matchPrefix: "/app",
        exact: true,
      },
      {
        href: "/app/contracts",
        label: "Contracts",
        description: "Primary operational records and workspaces.",
        short: "CT",
        matchPrefix: "/app/contracts",
      },
      {
        href: "/app/documents",
        label: "Reports",
        description: "Preview generated and mapped output sheets.",
        short: "RP",
        matchPrefix: "/app/documents",
      },
    ],
  },
  {
    title: "Master Data",
    items: [
      {
        href: "/app/masters/company-configuration",
        label: "Company Config",
        description: "Organization defaults and export constants.",
        short: "CO",
        matchPrefix: "/app/masters/company-configuration",
      },
      {
        href: "/app/masters/customers",
        label: "Buyers",
        description: "Buyer records reused across contracts.",
        short: "CU",
        matchPrefix: "/app/masters/customers",
      },
      {
        href: "/app/masters/items",
        label: "Items",
        description: "Coffee item definitions and packaging data.",
        short: "IT",
        matchPrefix: "/app/masters/items",
      },
    ],
  },
];

function buildContractSections(contractId: string): NavSection[] {
  return [
    {
      title: "Contract",
      items: [
        {
          href: "/app/contracts",
          label: "All Contracts",
          description: "Return to contract registry.",
          short: "LS",
          matchPrefix: "/app/contracts",
          exact: true,
        },
        {
          href: `/app/contracts/${contractId}`,
          label: "Overview",
          description: "Snapshot, progress, and next actions.",
          short: "OV",
          matchPrefix: `/app/contracts/${contractId}`,
          exact: true,
        },
        {
          href: `/app/contracts/${contractId}/activity`,
          label: "Activity",
          description: "Audit trail and workflow history.",
          short: "AC",
          matchPrefix: `/app/contracts/${contractId}/activity`,
        },
      ],
    },
    {
      title: "Source Documents",
      items: [
        {
          href: `/app/contracts/${contractId}/inputs/contract`,
          label: "Contract",
          description: "Commercial terms and pricing.",
          short: "CT",
          matchPrefix: `/app/contracts/${contractId}/inputs/contract`,
        },
        {
          href: `/app/contracts/${contractId}/inputs/shipping-instruction`,
          label: "Shipping",
          description: "Route and party instructions.",
          short: "SI",
          matchPrefix: `/app/contracts/${contractId}/inputs/shipping-instruction`,
        },
        {
          href: `/app/contracts/${contractId}/inputs/bank-lc`,
          label: "Bank & LC",
          description: "LC and bank details.",
          short: "LC",
          matchPrefix: `/app/contracts/${contractId}/inputs/bank-lc`,
        },
        {
          href: `/app/contracts/${contractId}/resolved-values`,
          label: "Resolved",
          description: "Final precedence output.",
          short: "RV",
          matchPrefix: `/app/contracts/${contractId}/resolved-values`,
        },
      ],
    },
    {
      title: "Execution",
      items: [
        {
          href: `/app/contracts/${contractId}/execution/bookings`,
          label: "Bookings",
          description: "Containers, seals, and vehicles.",
          short: "BK",
          matchPrefix: `/app/contracts/${contractId}/execution/bookings`,
        },
        {
          href: `/app/contracts/${contractId}/execution/staffing`,
          label: "Staffing",
          description: "Weights and certificate data.",
          short: "ST",
          matchPrefix: `/app/contracts/${contractId}/execution/staffing`,
        },
        {
          href: `/app/contracts/${contractId}/execution/processing`,
          label: "Processing",
          description: "Station and moisture details.",
          short: "PR",
          matchPrefix: `/app/contracts/${contractId}/execution/processing`,
        },
      ],
    },
    {
      title: "Outputs",
      items: [
        {
          href: `/app/contracts/${contractId}/documents`,
          label: "Documents",
          description: "Family generation and revisions.",
          short: "DC",
          matchPrefix: `/app/contracts/${contractId}/documents`,
        },
        {
          href: `/app/contracts/${contractId}/shipments`,
          label: "Shipments",
          description: "Shipment snapshots and totals.",
          short: "SP",
          matchPrefix: `/app/contracts/${contractId}/shipments`,
        },
      ],
    },
  ];
}

function isActive(pathname: string, item: NavItem): boolean {
  if (item.exact) {
    return pathname === item.href;
  }

  return pathname === item.href || pathname.startsWith(item.matchPrefix);
}

function toolbarCopy(pathname: string): { title: string; subtitle: string } {
  if (pathname.startsWith("/app/contracts/")) {
    const contractId = pathname.split("/").filter(Boolean)[2];
    return {
      title: `Contract Workspace ${contractId ? `· ${contractId.slice(0, 8)}` : ""}`,
      subtitle: "Manage this contract through source documents, execution, and generated outputs.",
    };
  }

  if (pathname.startsWith("/app/contracts")) {
    return {
      title: "Contracts",
      subtitle: "Manage contract records and open their operational workspaces.",
    };
  }

  if (pathname.startsWith("/app/masters")) {
    return {
      title: "Master Data",
      subtitle: "Maintain reusable company, buyer, and item records.",
    };
  }

  return {
    title: "Operations Workspace",
    subtitle: "Track contracts, documents, and execution from a single system.",
  };
}

function prettifySegment(segment: string): string {
  const labels: Record<string, string> = {
    app: "Overview",
    contracts: "Contracts",
    new: "New",
    masters: "Master Data",
    "company-configuration": "Company Configuration",
    customers: "Buyers",
    items: "Items",
    inputs: "Source Documents",
    "resolved-values": "Resolved Values",
    execution: "Execution",
    bookings: "Bookings",
    staffing: "Staffing",
    processing: "Processing",
    documents: "Documents",
    generated: "Generated",
    template: "Template",
    review: "Review",
    print: "Print",
    activity: "Activity",
    shipments: "Shipments",
    input: "Source Documents",
    "shipping-instruction": "Shipping Instruction",
    "bank-lc": "Bank & LC",
    "contract-si-lc": "Contract-SI-LC",
    "commercial-invoice-icc": "Commercial Invoice ICC",
    "commercial_invoice": "Commercial Invoice (ICC)",
    "packing_list": "Packing List",
    "shipping_instruction": "Shipping Instruction",
    "certificate_of_quality": "Certificate of Quality",
    "certificate_of_weight": "Certificate of Weight",
  };

  return labels[segment] ?? segment.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function isLikelyEntityId(segment: string): boolean {
  return /^[a-zA-Z0-9_-]{10,}$/.test(segment);
}

function breadcrumbLabel(segment: string, previous: string | null): string {
  if (isLikelyEntityId(segment)) {
    if (previous === "contracts") {
      return `Contract ${segment.slice(0, 8)}`;
    }

    if (previous === "customers") {
      return `Buyer ${segment.slice(0, 8)}`;
    }

    if (previous === "items") {
      return `Item ${segment.slice(0, 8)}`;
    }

    if (previous === "generated") {
      return `Document ${segment.slice(0, 8)}`;
    }

    if (previous === "shipments") {
      return `Shipment ${segment.slice(0, 8)}`;
    }
  }

  return prettifySegment(segment);
}

function buildBreadcrumbs(pathname: string): Array<{ href: string; label: string }> {
  const rawSegments = pathname.split("/").filter(Boolean);
  if (rawSegments.length === 0) {
    return [];
  }

  const segments = rawSegments[0] === "app" ? rawSegments.slice(1) : rawSegments;
  const breadcrumbs: Array<{ href: string; label: string }> = [{ href: "/app", label: "Overview" }];

  let currentPath = "/app";
  let previous: string | null = null;

  for (const segment of segments) {
    currentPath += `/${segment}`;
    breadcrumbs.push({
      href: currentPath,
      label: breadcrumbLabel(segment, previous),
    });
    previous = segment;
  }

  return breadcrumbs;
}

export function AppSidebar({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const pathnameSegments = pathname.split("/").filter(Boolean);
  const candidateContractId = pathnameSegments[0] === "app" && pathnameSegments[1] === "contracts" ? pathnameSegments[2] : null;
  const contractId = candidateContractId && candidateContractId !== "new" ? candidateContractId : null;
  const navSections = contractId ? buildContractSections(contractId) : sections;
  const toolbar = toolbarCopy(pathname);
  const breadcrumbs = buildBreadcrumbs(pathname);
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.localStorage.getItem("evodoc.sidebar.collapsed") === "true";
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    window.localStorage.setItem("evodoc.sidebar.collapsed", String(collapsed));
  }, [collapsed]);

  return (
    <div className={clsx("app-shell", collapsed && "is-collapsed", mobileOpen && "is-mobile-open")}>
      <aside className="app-sidebar">
        <div className="sidebar-brand">
          <Link href="/app" className="sidebar-brand-link">
            <span className="sidebar-brand-mark">EV</span>
            {!collapsed ? (
              <span>
                <strong>EvoDoc</strong>
                <small>coffee export ops</small>
              </span>
            ) : null}
          </Link>
          <button
            type="button"
            className="sidebar-toggle desktop-toggle"
            onClick={() => setCollapsed((current) => !current)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? ">>" : "<<"}
          </button>
        </div>

        {contractId && !collapsed ? (
          <div className="contract-context-pill">
            <strong>Contract {contractId.slice(0, 10)}</strong>
            <small>Contextual workspace navigation is active.</small>
          </div>
        ) : null}

        <nav className="app-sidebar-nav">
          {navSections.map((section) => (
            <section key={section.title} className="app-sidebar-section">
              {!collapsed ? <p className="app-sidebar-heading">{section.title}</p> : null}
              <div className="app-sidebar-links">
                {section.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={clsx("app-sidebar-link", isActive(pathname, item) && "active")}
                    title={collapsed ? item.label : undefined}
                    onClick={() => setMobileOpen(false)}
                  >
                    <span className="app-sidebar-badge">{item.short}</span>
                    {!collapsed ? (
                      <span className="app-sidebar-link-copy">
                        <strong>{item.label}</strong>
                        <small>{item.description}</small>
                      </span>
                    ) : null}
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </nav>
      </aside>

      <div className="app-content-shell">
        <header className="app-toolbar">
          <button
            type="button"
            className="sidebar-toggle mobile-toggle"
            onClick={() => setMobileOpen((current) => !current)}
            aria-label="Toggle navigation"
          >
            {mobileOpen ? "Close" : "Menu"}
          </button>
          <div>
            <p className="app-toolbar-title">{toolbar.title}</p>
            <p className="app-toolbar-subtitle">{toolbar.subtitle}</p>
            <nav className="app-breadcrumbs" aria-label="Breadcrumb">
              {breadcrumbs.map((crumb, index) => {
                const isLast = index === breadcrumbs.length - 1;

                return (
                  <span key={crumb.href} className="app-breadcrumb-item">
                    {index > 0 ? <span className="app-breadcrumb-sep">/</span> : null}
                    {isLast ? (
                      <span className="app-breadcrumb-current">{crumb.label}</span>
                    ) : (
                      <Link href={crumb.href} className="app-breadcrumb-link">
                        {crumb.label}
                      </Link>
                    )}
                  </span>
                );
              })}
            </nav>
          </div>
        </header>
        <div className="app-body">{children}</div>
      </div>

      {mobileOpen ? <button type="button" className="sidebar-backdrop" onClick={() => setMobileOpen(false)} /> : null}
    </div>
  );
}

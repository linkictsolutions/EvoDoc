"use client";

import Link from "next/link";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ToastProvider } from "@/components/ui/toast";

type SidebarIconName = "overview" | "contracts" | "documents" | "settings" | "buyers" | "templates";

type NavItem = {
  href: string;
  label: string;
  description: string;
  short: string;
  icon: SidebarIconName;
  matchPrefix: string;
  exact?: boolean;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const contractWorkspaceItems = [
  {
    key: "overview",
    label: "Overview",
    hint: "Snapshot and next actions.",
    href: (id: string) => `/app/contracts/${id}`,
  },
  {
    key: "inputs",
    label: "Source Documents",
    hint: "Contract, shipping, bank & LC, and MSC B/L.",
    href: (id: string) => `/app/contracts/${id}/inputs`,
  },
  {
    key: "resolved",
    label: "Resolved Values",
    hint: "Final precedence layer.",
    href: (id: string) => `/app/contracts/${id}/resolved-values`,
  },
  {
    key: "execution",
    label: "Execution",
    hint: "Bookings, staffing, and processing.",
    href: (id: string) => `/app/contracts/${id}/execution`,
  },
  {
    key: "documents",
    label: "Documents",
    hint: "Generate and review revisions.",
    href: (id: string) => `/app/contracts/${id}/documents`,
  },
  {
    key: "activity",
    label: "Activity",
    hint: "Audit trail and workflow events.",
    href: (id: string) => `/app/contracts/${id}/activity`,
  },
];

const sections: NavSection[] = [
  {
    title: "Operations",
    items: [
      {
        href: "/app",
        label: "Overview",
        description: "Workspace summary and next steps.",
        short: "OV",
        icon: "overview",
        matchPrefix: "/app",
        exact: true,
      },
      {
        href: "/app/contracts",
        label: "Contracts",
        description: "Primary operational records and workspaces.",
        short: "CT",
        icon: "contracts",
        matchPrefix: "/app/contracts",
      },
      {
        href: "/app/documents",
        label: "Documents",
        description: "Find generated document work by contract.",
        short: "DC",
        icon: "documents",
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
        icon: "settings",
        matchPrefix: "/app/masters/company-configuration",
      },
      {
        href: "/app/masters/customers",
        label: "Buyers",
        description: "Buyer records reused across contracts.",
        short: "CU",
        icon: "buyers",
        matchPrefix: "/app/masters/customers",
      },
      {
        href: "/app/masters/templates",
        label: "Templates",
        description: "Document layout templates per organization.",
        short: "TP",
        icon: "templates",
        matchPrefix: "/app/masters/templates",
      },
    ],
  },
];

function isActive(pathname: string, item: NavItem): boolean {
  if (item.exact) {
    return pathname === item.href;
  }

  return pathname === item.href || pathname.startsWith(`${item.matchPrefix}/`);
}

function activeContractWorkspaceKey(pathname: string, contractId: string): string {
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

function activeContractWorkspaceLabel(pathname: string, contractId: string): string | null {
  const activeKey = activeContractWorkspaceKey(pathname, contractId);
  return contractWorkspaceItems.find((item) => item.key === activeKey)?.label ?? null;
}

function SidebarIcon({ name }: { name: SidebarIconName }) {
  if (name === "contracts") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M4.75 7.75h5.15l1.6 2h7.75v8.5H4.75z" />
        <path d="M4.75 7.75v-2h5.1l1.6 2h7.8v2" />
        <path d="M7.5 13h9" />
      </svg>
    );
  }

  if (name === "documents") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M7 4.75h10v14.5H7z" />
        <path d="M9.75 8.5h4.5" />
        <path d="M9.75 11.75h4.5" />
        <path d="M9.75 15h3" />
      </svg>
    );
  }

  if (name === "settings") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M5.75 7.25h12.5" />
        <path d="M5.75 12h12.5" />
        <path d="M5.75 16.75h12.5" />
        <circle cx="9" cy="7.25" r="1.45" />
        <circle cx="15" cy="12" r="1.45" />
        <circle cx="11" cy="16.75" r="1.45" />
      </svg>
    );
  }

  if (name === "buyers") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M9.5 11.25a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
        <path d="M4.75 19.25a4.75 4.75 0 0 1 9.5 0" />
        <path d="M15.75 8.75a2.5 2.5 0 0 1 0 5" />
        <path d="M16.75 15.75a4 4 0 0 1 2.5 3.5" />
      </svg>
    );
  }

  if (name === "templates") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M5.75 5.75h12.5v12.5H5.75z" />
        <path d="M8.75 8.75h3" />
        <path d="M8.75 12h6.5" />
        <path d="M8.75 15.25h4.5" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M4.75 5.25h6.1v6.1h-6.1z" />
      <path d="M13.15 5.25h6.1v4.6h-6.1z" />
      <path d="M4.75 13.15h6.1v5.6h-6.1z" />
      <path d="M13.15 12.15h6.1v6.6h-6.1z" />
    </svg>
  );
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

  if (pathname.startsWith("/app/documents")) {
    return {
      title: "Documents",
      subtitle: "Find generated document workflows through their parent contracts.",
    };
  }

  if (pathname.startsWith("/app/masters")) {
    return {
      title: "Master Data",
      subtitle: "Maintain reusable company records, buyers, and document templates.",
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
    templates: "Templates",
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
    "bill-of-lading": "Bill of Lading",
    "contract-si-lc": "Resolved Values",
    "commercial-invoice-icc": "Commercial Invoice ICC",
    "commercial_invoice": "Commercial Invoice (ICC)",
    "packing_list": "Packing List (ICC)",
    "shipping_instruction": "Shipping Instruction",
    "certificate_of_quality": "Certificate of Quality",
    "certificate_of_weight": "Certificate of Weight",
    "way_bill": "Way Bill",
    "ico_certificate": "ICO Certificate",
    "bill_of_lading": "Bill of Lading (MSC)",
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

const documentFamilySegments = new Set([
  "commercial_invoice",
  "packing_list",
  "shipping_instruction",
  "certificate_of_quality",
  "certificate_of_weight",
  "way_bill",
  "ico_certificate",
  "bill_of_lading",
]);

function resolveDocumentFamilySegment(value: string | null): string | null {
  if (!value) {
    return null;
  }

  return documentFamilySegments.has(value) ? value : null;
}

function buildBreadcrumbsWithContext(
  pathname: string,
  documentFamilyFromQuery: string | null,
): Array<{ href: string; label: string }> {
  const rawSegments = pathname.split("/").filter(Boolean);
  if (rawSegments.length === 0) {
    return [];
  }

  const segments = rawSegments[0] === "app" ? rawSegments.slice(1) : rawSegments;
  const familySegment = resolveDocumentFamilySegment(documentFamilyFromQuery);
  const isGeneratedDocumentPath = segments[0] === "contracts"
    && segments[2] === "documents"
    && segments[3] === "generated";
  const breadcrumbs: Array<{ href: string; label: string }> = [{ href: "/app", label: "Overview" }];

  let currentPath = "/app";
  let previous: string | null = null;
  let index = 0;

  for (const segment of segments) {
    if (isGeneratedDocumentPath && familySegment && segment === "generated" && index === 3) {
      const contractId = segments[1];
      breadcrumbs.push({
        href: `/app/contracts/${contractId}/documents/${familySegment}`,
        label: prettifySegment(familySegment),
      });
    }

    currentPath += `/${segment}`;
    let href = currentPath;

    if (isGeneratedDocumentPath) {
      const contractId = segments[1];
      const familyHref = familySegment
        ? `/app/contracts/${contractId}/documents/${familySegment}`
        : `/app/contracts/${contractId}/documents`;

      if (segment === "generated") {
        href = familyHref;
      } else if (previous === "generated" && isLikelyEntityId(segment)) {
        const familyQuery = familySegment ? `?family=${encodeURIComponent(familySegment)}` : "";
        href = `/app/contracts/${contractId}/documents/generated/${segment}/review${familyQuery}`;
      }
    }

    breadcrumbs.push({
      href,
      label: breadcrumbLabel(segment, previous),
    });
    previous = segment;
    index += 1;
  }

  return breadcrumbs;
}

export function AppSidebar({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const pathnameSegments = pathname.split("/").filter(Boolean);
  const candidateContractId = pathnameSegments[0] === "app" && pathnameSegments[1] === "contracts" ? pathnameSegments[2] : null;
  const contractId = candidateContractId && candidateContractId !== "new" ? candidateContractId : null;
  const navSections = sections;
  const toolbar = toolbarCopy(pathname);
  const [collapsed, setCollapsed] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [documentFamilyQuery, setDocumentFamilyQuery] = useState<string | null>(null);
  const [visibleContractId, setVisibleContractId] = useState<string | null>(contractId);
  const [contractNavClosing, setContractNavClosing] = useState(false);

  useEffect(() => {
    // This runs only on the client after hydration to avoid SSR/client mismatches.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCollapsed(window.localStorage.getItem("evodoc.sidebar.collapsed") === "true");
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    window.localStorage.setItem("evodoc.sidebar.collapsed", String(collapsed));
  }, [collapsed, hasHydrated]);

  useEffect(() => {
    if (contractId) {
      const timeout = window.setTimeout(() => {
        setVisibleContractId(contractId);
        setContractNavClosing(false);
      }, 0);

      return () => window.clearTimeout(timeout);
    }

    if (!visibleContractId) {
      return;
    }

    const closingTimeout = window.setTimeout(() => {
      setContractNavClosing(true);
    }, 0);
    const timeout = window.setTimeout(() => {
      setVisibleContractId(null);
      setContractNavClosing(false);
    }, 180);

    return () => {
      window.clearTimeout(closingTimeout);
      window.clearTimeout(timeout);
    };
  }, [contractId, visibleContractId]);

  useEffect(() => {
    function updateDocumentFamilyQuery() {
      if (typeof window === "undefined") {
        return;
      }

      const query = new URLSearchParams(window.location.search).get("family");
      setDocumentFamilyQuery(query);
    }

    updateDocumentFamilyQuery();
    window.addEventListener("popstate", updateDocumentFamilyQuery);

    return () => {
      window.removeEventListener("popstate", updateDocumentFamilyQuery);
    };
  }, [pathname]);

  const breadcrumbs = buildBreadcrumbsWithContext(pathname, documentFamilyQuery);
  const displayContractId = contractId ?? visibleContractId;
  const contractWorkspaceKey = contractId ? activeContractWorkspaceKey(pathname, contractId) : null;
  const contractWorkspaceLabel = contractId ? activeContractWorkspaceLabel(pathname, contractId) : null;

  return (
    <ToastProvider>
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
              <svg className="sidebar-toggle-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <rect x="4.75" y="5.25" width="14.5" height="13.5" rx="3" />
                <path d="M9.25 5.5v13" />
                <path className="sidebar-toggle-arrow" d="m14 9.25 2.75 2.75L14 14.75" />
              </svg>
            </button>
          </div>

          <nav className="app-sidebar-nav">
            {navSections.map((section) => (
              <section key={section.title} className="app-sidebar-section" data-section-title={section.title}>
                {!collapsed ? <p className="app-sidebar-heading">{section.title}</p> : null}
                <div className="app-sidebar-links">
                  {section.items.map((item) => {
                    const isContractsLink = item.href === "/app/contracts";
                    const showContractWorkspace = displayContractId && isContractsLink && !collapsed;
                    const showCollapsedContractWorkspace = displayContractId && isContractsLink && collapsed;
                    const isCurrentItem = isActive(pathname, item);

                    return (
                      <div
                        key={item.href}
                        className={clsx("app-sidebar-link-group", showCollapsedContractWorkspace && "has-collapsed-flyout")}
                      >
                        <Link
                          href={item.href}
                          className={clsx("app-sidebar-link", isCurrentItem && "active")}
                          data-label={item.label}
                          data-active-label={isCurrentItem ? item.label : undefined}
                          title={collapsed ? item.label : undefined}
                          onClick={() => setMobileOpen(false)}
                        >
                          <span className="app-sidebar-badge" aria-hidden>
                            <SidebarIcon name={item.icon} />
                          </span>
                          {!collapsed ? (
                            <span className="app-sidebar-link-copy">
                              <strong>{item.label} <span className="app-sidebar-link-short">{item.short}</span></strong>
                              <small>{item.description}</small>
                            </span>
                          ) : null}
                        </Link>

                        {showContractWorkspace ? (
                          <div className={clsx("app-contract-nav", contractNavClosing && "is-exiting")} aria-label="Contract Workspace">
                            <div className="app-contract-nav-heading">
                              <strong>Contract Workspace</strong>
                              <small>Contract {displayContractId.slice(0, 10)}</small>
                            </div>
                            {contractWorkspaceItems.map((workspaceItem, index) => (
                              <Link
                                key={workspaceItem.key}
                                href={workspaceItem.href(displayContractId)}
                                className={clsx("app-contract-nav-link", contractWorkspaceKey === workspaceItem.key && "active")}
                                onClick={() => setMobileOpen(false)}
                              >
                                <span className="app-contract-nav-index">{index + 1}</span>
                                <span>
                                  <strong>{workspaceItem.label}</strong>
                                  <small>{workspaceItem.hint}</small>
                                </span>
                              </Link>
                            ))}
                          </div>
                        ) : null}

                        {showCollapsedContractWorkspace ? (
                          <div className={clsx("app-contract-nav-flyout", contractNavClosing && "is-exiting")} aria-label="Contract Workspace">
                            <div className="app-contract-nav-heading">
                              <strong>Contract Workspace</strong>
                              <small>Contract {displayContractId.slice(0, 10)}</small>
                            </div>
                            {contractWorkspaceItems.map((workspaceItem, index) => (
                              <Link
                                key={workspaceItem.key}
                                href={workspaceItem.href(displayContractId)}
                                className={clsx("app-contract-nav-link", contractWorkspaceKey === workspaceItem.key && "active")}
                                onClick={() => setMobileOpen(false)}
                              >
                                <span className="app-contract-nav-index">{index + 1}</span>
                                <span>
                                  <strong>{workspaceItem.label}</strong>
                                  <small>{workspaceItem.hint}</small>
                                </span>
                              </Link>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
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
              <span className={clsx("mobile-toggle-icon", mobileOpen && "is-open")} aria-hidden />
              <span>{mobileOpen ? "Close Panel" : "Open Panel"}</span>
            </button>
            <div>
              <p className="app-toolbar-title">{toolbar.title}</p>
              <p className="app-toolbar-subtitle">
                {collapsed && contractWorkspaceLabel ? `${toolbar.subtitle} Current step: ${contractWorkspaceLabel}.` : toolbar.subtitle}
              </p>
              <nav className="app-breadcrumbs" aria-label="Breadcrumb">
                {breadcrumbs.map((crumb, index) => {
                  const isLast = index === breadcrumbs.length - 1;

                  return (
                    <span key={`${crumb.href}-${index}`} className="app-breadcrumb-item">
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

        {mobileOpen ? (
          <button type="button" className="sidebar-backdrop" onClick={() => setMobileOpen(false)} />
        ) : null}
      </div>
    </ToastProvider>
  );
}

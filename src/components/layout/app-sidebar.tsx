"use client";

import Link from "next/link";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ToastProvider } from "@/components/ui/toast";

type NavItem = {
  href: string;
  label: string;
  description: string;
  short: string;
  glyph: string;
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
        glyph: "O",
        matchPrefix: "/app",
        exact: true,
      },
      {
        href: "/app/contracts",
        label: "Contracts",
        description: "Primary operational records and workspaces.",
        short: "CT",
        glyph: "C",
        matchPrefix: "/app/contracts",
      },
      {
        href: "/app/documents",
        label: "Documents",
        description: "Find generated document work by contract.",
        short: "DC",
        glyph: "D",
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
        glyph: "G",
        matchPrefix: "/app/masters/company-configuration",
      },
      {
        href: "/app/masters/customers",
        label: "Buyers",
        description: "Buyer records reused across contracts.",
        short: "CU",
        glyph: "B",
        matchPrefix: "/app/masters/customers",
      },
      {
        href: "/app/masters/templates",
        label: "Templates",
        description: "Document layout templates per organization.",
        short: "TP",
        glyph: "T",
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
              <span aria-hidden>{collapsed ? ">" : "<"}</span>
            </button>
          </div>

          {contractId && !collapsed ? (
            <div className="contract-context-pill">
              <strong>Contract {contractId.slice(0, 10)}</strong>
              <small>Open in the workspace below.</small>
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
                      <span className="app-sidebar-badge" aria-hidden>{item.glyph}</span>
                      {!collapsed ? (
                        <span className="app-sidebar-link-copy">
                          <strong>{item.label} <span className="app-sidebar-link-short">{item.short}</span></strong>
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
              <span className={clsx("mobile-toggle-icon", mobileOpen && "is-open")} aria-hidden />
              <span>{mobileOpen ? "Close Panel" : "Open Panel"}</span>
            </button>
            <div>
              <p className="app-toolbar-title">{toolbar.title}</p>
              <p className="app-toolbar-subtitle">{toolbar.subtitle}</p>
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

"use client";

import Link from "next/link";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type NavItem = {
  href: string;
  label: string;
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
      { href: "/app", label: "Overview", short: "OV", matchPrefix: "/app", exact: true },
      { href: "/app/contracts", label: "Contracts", short: "CT", matchPrefix: "/app/contracts" },
    ],
  },
  {
    title: "Master Data",
    items: [
      { href: "/app/masters/company-configuration", label: "Company Config", short: "CO", matchPrefix: "/app/masters/company-configuration" },
      { href: "/app/masters/customers", label: "Customers", short: "CU", matchPrefix: "/app/masters/customers" },
      { href: "/app/masters/items", label: "Items", short: "IT", matchPrefix: "/app/masters/items" },
    ],
  },
];

function isActive(pathname: string, item: NavItem): boolean {
  if (item.exact) {
    return pathname === item.href;
  }

  return pathname === item.href || pathname.startsWith(item.matchPrefix);
}

export function AppSidebar({ children }: { children: ReactNode }) {
  const pathname = usePathname();
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

        <nav className="app-sidebar-nav">
          {sections.map((section) => (
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
                    {!collapsed ? <span>{item.label}</span> : null}
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
            <p className="app-toolbar-title">ERP Workspace</p>
            <p className="app-toolbar-subtitle">Contracts, masters, and document workflows.</p>
          </div>
        </header>
        <div className="app-body">{children}</div>
      </div>

      {mobileOpen ? <button type="button" className="sidebar-backdrop" onClick={() => setMobileOpen(false)} /> : null}
    </div>
  );
}

"use client";

import Link from "next/link";

const templates = [
  {
    href: "/app/masters/templates/commercial-invoice-icc",
    title: "Commercial Invoice (ICC)",
    description: "Export invoice layout with goods table, totals, and branding slots.",
    tag: "ICC",
  },
  {
    href: "/app/masters/templates/packing-list-icc",
    title: "Packing List (ICC)",
    description: "Container table, package totals, and full marking layout.",
    tag: "ICC",
  },
  {
    href: "/app/masters/templates/shipping-instructions",
    title: "Shipping Instruction",
    description: "Carrier-facing shipping instruction blocks and routing fields.",
    tag: "Carrier",
  },
  {
    href: "/app/masters/templates/certificate-of-quality",
    title: "Certificate of Quality",
    description: "Quality certificate layout with moisture and shipment details.",
    tag: "Certificate",
  },
  {
    href: "/app/masters/templates/certificate-of-weight",
    title: "Certificate of Weight",
    description: "Per-container weight totals and certification blocks.",
    tag: "Certificate",
  },
  {
    href: "/app/masters/templates/way-bill",
    title: "Way Bill",
    description: "Driver-based waybill layout with truck, trailer, and seal fields.",
    tag: "Execution",
  },
  {
    href: "/app/masters/templates/ico-certificate",
    title: "ICO Certificate of Origin",
    description: "Mapped ICO certificate fields for pre-printed form output.",
    tag: "ICO",
  },
  {
    href: "/app/masters/templates/bill-of-lading",
    title: "Bill of Lading (MSC)",
    description: "MSC bill of lading main page and continuation-ready cargo block.",
    tag: "MSC",
  },
] as const;

export function TemplatesMasterPage() {
  return (
    <section className="page-shell">
      <header className="page-header dashboard-hero">
        <div className="dashboard-hero-copy">
          <p className="dashboard-eyebrow">Master Data</p>
          <h1>Document Templates</h1>
          <p>Configure how generated documents are laid out for your organization.</p>
        </div>
      </header>

      <section className="template-library-grid">
        {templates.map((template) => (
          <article key={template.href} className="card template-library-card">
            <div className="template-library-card-top">
              <span className="template-library-tag">{template.tag}</span>
              <h2>{template.title}</h2>
              <p className="sidebar-subtitle">{template.description}</p>
            </div>
            <div className="row-actions template-library-actions">
              <Link href={template.href}>
                <button type="button">Open Template</button>
              </Link>
            </div>
          </article>
        ))}
      </section>
    </section>
  );
}

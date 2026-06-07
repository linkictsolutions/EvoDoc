"use client";

import Link from "next/link";

export function TemplatesMasterPage() {
  return (
    <section className="page-shell">
      <header className="page-header">
        <h1>Document Templates</h1>
        <p>
          Configure how documents are laid out for your organization. Start with Commercial Invoice (ICC), then expand to other documents.
        </p>
      </header>

      <section className="card">
        <h2>Commercial Invoice (ICC)</h2>
        <p className="muted-text">
          Baseline layout mapping (read-only for now). Next step is enabling drag + resize on an A4 grid.
        </p>
        <div className="row-actions">
          <Link href="/app/masters/templates/commercial-invoice-icc">
            <button type="button">Open Template</button>
          </Link>
        </div>
      </section>

      <section className="card">
        <h2>Packing List (ICC)</h2>
        <p className="muted-text">
          Template-driven layout for the ICC packing list (containers table + totals + full marking).
        </p>
        <div className="row-actions">
          <Link href="/app/masters/templates/packing-list-icc">
            <button type="button">Open Template</button>
          </Link>
        </div>
      </section>

      <section className="card">
        <h2>Shipping Instruction</h2>
        <p className="muted-text">
          Template-driven layout for Shipping Instructions.
        </p>
        <div className="row-actions">
          <Link href="/app/masters/templates/shipping-instructions">
            <button type="button">Open Template</button>
          </Link>
        </div>
      </section>

      <section className="card">
        <h2>Certificate of Quality</h2>
        <p className="muted-text">
          Template-driven layout for the certificate of quality.
        </p>
        <div className="row-actions">
          <Link href="/app/masters/templates/certificate-of-quality">
            <button type="button">Open Template</button>
          </Link>
        </div>
      </section>

      <section className="card">
        <h2>Certificate of Weight</h2>
        <p className="muted-text">
          Template-driven layout for the certificate of weight.
        </p>
        <div className="row-actions">
          <Link href="/app/masters/templates/certificate-of-weight">
            <button type="button">Open Template</button>
          </Link>
        </div>
      </section>

      <section className="card">
        <h2>Way Bill</h2>
        <p className="muted-text">
          Template-driven layout for Way Bills (per driver tab).
        </p>
        <div className="row-actions">
          <Link href="/app/masters/templates/way-bill">
            <button type="button">Open Template</button>
          </Link>
        </div>
      </section>

      <section className="card">
        <h2>ICO Certificate of Origin</h2>
        <p className="muted-text">
          Template editor for mapped ICO certificate fields (text blocks).
        </p>
        <div className="row-actions">
          <Link href="/app/masters/templates/ico-certificate">
            <button type="button">Open Template</button>
          </Link>
        </div>
      </section>

      <section className="card">
        <h2>Bill of Lading (MSC)</h2>
        <p className="muted-text">
          Template-driven layout for the MSC bill of lading main page and continuation-ready cargo block.
        </p>
        <div className="row-actions">
          <Link href="/app/masters/templates/bill-of-lading">
            <button type="button">Open Template</button>
          </Link>
        </div>
      </section>
    </section>
  );
}

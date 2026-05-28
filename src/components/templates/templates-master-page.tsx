"use client";

import Link from "next/link";

export function TemplatesMasterPage() {
  return (
    <section className="page-shell">
      <header className="page-header">
        <h1>Document Templates</h1>
        <p>
          Configure how documents are laid out for your organization. Start with Commercial Invoice (ICC).
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
    </section>
  );
}


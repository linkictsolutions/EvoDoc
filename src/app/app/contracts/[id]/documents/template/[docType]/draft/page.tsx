"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { DocumentType } from "@/types/models";
import { GenerateDocumentButton } from "@/components/forms/document-actions";

export default function DocumentDraftPage({
  params,
}: {
  params: Promise<{ id: string; docType: DocumentType }>;
}) {
  const searchParams = useSearchParams();
  const [state, setState] = useState<{ contractId: string; docType: DocumentType } | null>(null);

  useEffect(() => {
    Promise.resolve(params).then(({ id, docType }) => setState({ contractId: id, docType }));
  }, [params]);

  if (!state) {
    return <section className="card"><p>Loading...</p></section>;
  }

  const shipmentId = searchParams.get("shipmentId");

  return (
    <section className="page-shell">
      <header className="page-header">
        <h1>Generate {state.docType}</h1>
        <p>Select latest shipment and generate draft snapshot using template + logic versions.</p>
      </header>

      {!shipmentId ? (
        <section className="card">
          <p className="error-text">Missing shipmentId in query string.</p>
        </section>
      ) : (
        <GenerateDocumentButton contractId={state.contractId} shipmentId={shipmentId} docType={state.docType} />
      )}
    </section>
  );
}

"use client";

import { useEffect, useState } from "react";
import type { DocumentType } from "@/types/models";
import { GenerateDocumentButton } from "@/components/forms/document-actions";
import { CenteredLoader } from "@/components/ui/centered-loader";

export default function DocumentDraftPage({
  params,
}: {
  params: Promise<{ id: string; docType: DocumentType }>;
}) {
  const [state, setState] = useState<{ contractId: string; docType: DocumentType } | null>(null);
  const [shipmentId, setShipmentId] = useState<string | null>(null);

  useEffect(() => {
    Promise.resolve(params).then(({ id, docType }) => setState({ contractId: id, docType }));
  }, [params]);

  useEffect(() => {
    function updateShipmentId() {
      if (typeof window === "undefined") {
        return;
      }

      const nextShipmentId = new URLSearchParams(window.location.search).get("shipmentId");
      setShipmentId(nextShipmentId);
    }

    updateShipmentId();
    window.addEventListener("popstate", updateShipmentId);

    return () => {
      window.removeEventListener("popstate", updateShipmentId);
    };
  }, []);

  if (!state) {
    return (
      <section className="card">
        <CenteredLoader label="Loading..." />
      </section>
    );
  }

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

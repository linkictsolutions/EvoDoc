"use client";

import { useEffect, useState } from "react";
import { DocumentPrintTemplate } from "@/components/documents/document-print-template";
import { apiClient } from "@/lib/api/client";
import { DEFAULT_ORG_ID } from "@/lib/config";
import type { DocumentOutputSnapshot } from "@/types/models";

type PrintPayload = {
  id: string;
  outputSnapshot: DocumentOutputSnapshot;
};

export default function DocumentPrintPage({
  params,
}: {
  params: Promise<{ id: string; docId: string }>;
}) {
  const [payload, setPayload] = useState<PrintPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    Promise.resolve(params)
      .then(async ({ id, docId }) => {
        const data = await apiClient<PrintPayload>(
          `/api/documents/${docId}/print-data?orgId=${DEFAULT_ORG_ID}&contractId=${id}`,
        );

        if (mounted) {
          setPayload(data);
        }
      })
      .catch((loadError: Error) => {
        if (mounted) {
          setError(loadError.message);
        }
      });

    return () => {
      mounted = false;
    };
  }, [params]);

  if (error) {
    return (
      <main>
        <section className="card">
          <p className="error-text">{error}</p>
        </section>
      </main>
    );
  }

  if (!payload) {
    return (
      <main>
        <section className="card">
          <p>Loading print data...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="card print-controls">
        <h1>Print Preview</h1>
        <button type="button" onClick={() => window.print()}>
          Print
        </button>
      </section>
      <DocumentPrintTemplate output={payload.outputSnapshot} documentId={payload.id} />
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import { DocumentPrintTemplate } from "@/components/documents/document-print-template";
import { apiClient } from "@/lib/api/client";
import { DEFAULT_ORG_ID } from "@/lib/config";
import type { CompanyConfiguration, DocumentInputSnapshot, DocumentOutputSnapshot } from "@/types/models";

type PrintPayload = {
  id: string;
  isFinal?: boolean;
  outputSnapshot: DocumentOutputSnapshot;
  inputSnapshot: DocumentInputSnapshot;
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
        const [data, companyConfiguration] = await Promise.all([
          apiClient<PrintPayload>(
            `/api/documents/${docId}/print-data?orgId=${DEFAULT_ORG_ID}&contractId=${id}`,
          ),
          apiClient<CompanyConfiguration>(`/api/company-configuration?orgId=${DEFAULT_ORG_ID}`),
        ]);

        if (mounted) {
          setPayload({
            ...data,
            inputSnapshot: {
              ...data.inputSnapshot,
              companyConfiguration,
            },
          });
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
    <main className="document-print-page">
      <section className="card print-controls screen-only">
        <h1>Print Preview</h1>
        <button type="button" onClick={() => window.print()}>
          Print
        </button>
      </section>
      <section className="document-print-root">
        <DocumentPrintTemplate
          output={payload.outputSnapshot}
          input={payload.inputSnapshot}
          documentId={payload.id}
          isFinal={payload.isFinal ?? false}
        />
      </section>
    </main>
  );
}

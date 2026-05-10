"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DocumentPrintTemplate } from "@/components/documents/document-print-template";
import { apiClient } from "@/lib/api/client";
import { DEFAULT_ORG_ID } from "@/lib/config";
import { CenteredLoader } from "@/components/ui/centered-loader";
import type {
  CompanyConfiguration,
  DocumentFamily,
  DocumentInputSnapshot,
  DocumentOutputSnapshot,
  DocumentType,
} from "@/types/models";

type PrintPayload = {
  id: string;
  isFinal?: boolean;
  outputSnapshot: DocumentOutputSnapshot;
  inputSnapshot: DocumentInputSnapshot;
};

function resolveFamilyFromDocType(docType: DocumentType): DocumentFamily {
  if (docType === "invoice") {
    return "commercial_invoice";
  }

  if (docType === "packing_list") {
    return "packing_list";
  }

  if (docType === "quality_certificate") {
    return "certificate_of_quality";
  }

  if (docType === "weight_certificate") {
    return "certificate_of_weight";
  }

  if (docType === "way_bill") {
    return "way_bill";
  }

  if (docType === "ico_certificate") {
    return "ico_certificate";
  }

  return "shipping_instruction";
}

export default function DocumentPrintPage({
  params,
}: {
  params: Promise<{ id: string; docId: string }>;
}) {
  const router = useRouter();
  const [payload, setPayload] = useState<PrintPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [familyFromQuery, setFamilyFromQuery] = useState<string | null>(null);

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

  useEffect(() => {
    if (familyFromQuery || !payload?.outputSnapshot.docType) {
      return;
    }

    const currentPath = window.location.pathname;
    const resolved = resolveFamilyFromDocType(payload.outputSnapshot.docType);
    router.replace(`${currentPath}?family=${encodeURIComponent(resolved)}`);
  }, [familyFromQuery, payload?.outputSnapshot.docType, router]);

  useEffect(() => {
    function updateFamilyFromQuery() {
      if (typeof window === "undefined") {
        return;
      }

      const nextFamily = new URLSearchParams(window.location.search).get("family");
      setFamilyFromQuery(nextFamily);
    }

    updateFamilyFromQuery();
    window.addEventListener("popstate", updateFamilyFromQuery);

    return () => {
      window.removeEventListener("popstate", updateFamilyFromQuery);
    };
  }, []);

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
          <CenteredLoader label="Loading print data..." />
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

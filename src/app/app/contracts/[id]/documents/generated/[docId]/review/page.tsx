"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ReviewActions } from "@/components/forms/document-actions";
import { apiClient } from "@/lib/api/client";
import { DEFAULT_ORG_ID } from "@/lib/config";
import type { DocumentFamily, DocumentOutputSnapshot, DocumentType } from "@/types/models";
import { CenteredLoader } from "@/components/ui/centered-loader";

type PrintPayload = {
  id: string;
  docType: DocumentType;
  revisionNumber?: number;
  status: string;
  isFinal?: boolean;
  snapshotHash: string;
  approvedSnapshotHash?: string;
  validationWarnings?: string[];
  outputSnapshot: DocumentOutputSnapshot;
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

  return "shipping_instruction";
}

export default function DocumentReviewPage({
  params,
}: {
  params: Promise<{ id: string; docId: string }>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [contractId, setContractId] = useState("");
  const [docId, setDocId] = useState("");
  const [data, setData] = useState<PrintPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const familyFromQuery = searchParams.get("family");
  const resolvedFamily = familyFromQuery ?? (data ? resolveFamilyFromDocType(data.docType) : null);
  const familyQuery = resolvedFamily ? `?family=${encodeURIComponent(resolvedFamily)}` : "";

  useEffect(() => {
    let mounted = true;

    Promise.resolve(params)
      .then(async ({ id, docId }) => {
        if (!mounted) return;
        setContractId(id);
        setDocId(docId);

        const payload = await apiClient<PrintPayload>(
          `/api/documents/${docId}/print-data?orgId=${DEFAULT_ORG_ID}&contractId=${id}`,
        );

        if (mounted) {
          setData(payload);
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
    if (familyFromQuery || !data || !contractId || !docId) {
      return;
    }

    const resolved = resolveFamilyFromDocType(data.docType);
    router.replace(`/app/contracts/${contractId}/documents/generated/${docId}/review?family=${encodeURIComponent(resolved)}`);
  }, [contractId, data, docId, familyFromQuery, router]);

  return (
    <section className="page-shell">
      <header className="page-header">
        <h1>Document Review</h1>
        <p>Submit for review, approve/reject, and print output.</p>
      </header>

      {error ? <section className="card"><p className="error-text">{error}</p></section> : null}

      {data ? (
        <section className="card">
          <p><strong>Type:</strong> {data.docType}</p>
          {data.revisionNumber ? <p><strong>Revision:</strong> v{data.revisionNumber}</p> : null}
          <p>
            <strong>Status:</strong>{" "}
            <span className={`status-pill status-${data.status.toLowerCase().replace(/\s+/g, "-")}`}>{data.status}</span>
          </p>
          <p>
            <strong>Version:</strong>{" "}
            <span className={`status-pill ${data.isFinal ? "status-approved" : "status-draft"}`}>
              {data.isFinal ? "Final" : "Draft"}
            </span>
          </p>
          <p><strong>Title:</strong> {data.outputSnapshot.title}</p>
          <p><strong>Snapshot Hash:</strong> <code>{data.snapshotHash}</code></p>
          {data.approvedSnapshotHash ? (
            <p><strong>Approved Hash:</strong> <code>{data.approvedSnapshotHash}</code></p>
          ) : null}
          {data.validationWarnings && data.validationWarnings.length > 0 ? (
            <div className="mt-md">
              <strong>Validation Warnings</strong>
              <ul className="list-indent mt-sm">
                {data.validationWarnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <Link href={`/app/contracts/${contractId}/documents/generated/${docId}/print${familyQuery}`} target="_blank">
            <button type="button" className="mt-md button-secondary">Open Print View</button>
          </Link>
        </section>
      ) : (
        <section className="card">
          <CenteredLoader label="Loading document..." />
        </section>
      )}

      {contractId && docId && data ? (
        <ReviewActions
          contractId={contractId}
          documentId={docId}
          status={data.status}
          isFinal={Boolean(data.isFinal)}
          onMarkedFinal={() => {
            setData((current) => (current ? { ...current, isFinal: true } : current));
          }}
        />
      ) : null}
    </section>
  );
}

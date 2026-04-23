"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ReviewActions } from "@/components/forms/document-actions";
import { apiClient } from "@/lib/api/client";
import { DEFAULT_ORG_ID } from "@/lib/config";
import type { DocumentOutputSnapshot } from "@/types/models";

type PrintPayload = {
  id: string;
  docType: string;
  docVariant?: string;
  revisionNumber?: number;
  status: string;
  snapshotHash: string;
  approvedSnapshotHash?: string;
  validationWarnings?: string[];
  outputSnapshot: DocumentOutputSnapshot;
};

export default function DocumentReviewPage({
  params,
}: {
  params: Promise<{ id: string; docId: string }>;
}) {
  const [contractId, setContractId] = useState("");
  const [docId, setDocId] = useState("");
  const [data, setData] = useState<PrintPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

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
          {data.docVariant ? <p><strong>Variant:</strong> {data.docVariant}</p> : null}
          {data.revisionNumber ? <p><strong>Revision:</strong> v{data.revisionNumber}</p> : null}
          <p>
            <strong>Status:</strong>{" "}
            <span className={`status-pill status-${data.status.toLowerCase().replace(/\s+/g, "-")}`}>{data.status}</span>
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
          <Link href={`/app/contracts/${contractId}/documents/generated/${docId}/print`} target="_blank">
            <button type="button" className="mt-md button-secondary">Open Print View</button>
          </Link>
        </section>
      ) : (
        <section className="card"><p>Loading document...</p></section>
      )}

      {contractId && docId ? <ReviewActions contractId={contractId} documentId={docId} /> : null}
    </section>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DocumentType, DocumentVariant } from "@/types/models";
import { apiClient } from "@/lib/api/client";
import { DEFAULT_ORG_ID } from "@/lib/config";

export function GenerateDocumentButton({
  contractId,
  shipmentId,
  docType,
  docVariant,
  buttonLabel,
}: {
  contractId: string;
  shipmentId?: string;
  docType: DocumentType;
  docVariant?: DocumentVariant;
  buttonLabel?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient<{ docId: string }>("/api/documents/generate", {
        method: "POST",
        body: JSON.stringify({
          orgId: DEFAULT_ORG_ID,
          contractId,
          shipmentId,
          docType,
          docVariant,
          templateVersion: "v1",
        }),
      });

      router.push(`/app/contracts/${encodeURIComponent(contractId)}/documents/generated/${data.docId}/review`);
    } catch (generateError) {
      setError((generateError as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <button type="button" onClick={generate} disabled={loading}>
        {loading ? "Generating..." : (buttonLabel ?? `Generate ${docType}`)}
      </button>
      {error ? <p className="error-text">{error}</p> : null}
    </div>
  );
}

export function ReviewActions({
  contractId,
  documentId,
  status,
  isFinal = false,
  onMarkedFinal,
}: {
  contractId: string;
  documentId: string;
  status?: string;
  isFinal?: boolean;
  onMarkedFinal?: () => void;
}) {
  const [comment, setComment] = useState("Looks good");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"submit" | "approve" | "reject" | "markFinal" | null>(null);
  const router = useRouter();

  async function submitForReview() {
    setBusy("submit");
    setError(null);
    try {
      await apiClient(`/api/documents/${documentId}/submit-review`, {
        method: "POST",
        body: JSON.stringify({
          orgId: DEFAULT_ORG_ID,
          contractId,
        }),
      });
      router.refresh();
    } catch (submitError) {
      setError((submitError as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function decide(decision: "approve" | "reject") {
    setBusy(decision);
    setError(null);
    try {
      await apiClient(`/api/documents/${documentId}/decision`, {
        method: "POST",
        body: JSON.stringify({
          orgId: DEFAULT_ORG_ID,
          contractId,
          decision,
          comment,
        }),
      });
      router.refresh();
    } catch (decisionError) {
      setError((decisionError as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function markFinal() {
    setBusy("markFinal");
    setError(null);
    try {
      await apiClient(`/api/documents/${documentId}/mark-final`, {
        method: "POST",
        body: JSON.stringify({
          orgId: DEFAULT_ORG_ID,
          contractId,
        }),
      });
      onMarkedFinal?.();
      router.refresh();
    } catch (markError) {
      setError((markError as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const normalizedStatus = (status ?? "").toLowerCase();
  const canMarkFinal = normalizedStatus === "approved";

  return (
    <section className="card form-grid">
      <h3>Workflow Actions</h3>
      <button type="button" onClick={submitForReview} disabled={busy !== null}>
        {busy === "submit" ? "Submitting..." : "Submit for Review"}
      </button>

      <button type="button" onClick={markFinal} disabled={busy !== null || isFinal || !canMarkFinal}>
        {isFinal
          ? "Already Final"
          : !canMarkFinal
            ? "Approve to Mark Final"
            : busy === "markFinal"
              ? "Marking..."
              : "Mark as Final"}
      </button>

      <label>
        Decision Comment
        <textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={3} />
      </label>

      <div className="row-actions">
        <button type="button" onClick={() => decide("approve")} disabled={busy !== null}>
          {busy === "approve" ? "Approving..." : "Approve"}
        </button>
        <button type="button" onClick={() => decide("reject")} disabled={busy !== null}>
          {busy === "reject" ? "Rejecting..." : "Reject"}
        </button>
      </div>

      {error ? <p className="error-text">{error}</p> : null}
    </section>
  );
}

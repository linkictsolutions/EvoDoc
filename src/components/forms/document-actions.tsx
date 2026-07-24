"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { readTemplateLayoutForDocType } from "@/lib/documents/template-storage-keys";
import type { DocumentFamily, DocumentType, DocumentVariant } from "@/types/models";
import { apiClient } from "@/lib/api/client";
import { DEFAULT_ORG_ID } from "@/lib/config";
import { useToast } from "@/components/ui/toast";
import { FormActionBar } from "@/components/ui/form-action-bar";
import { FormSection } from "@/components/ui/form-section";

export function GenerateDocumentButton({
  contractId,
  shipmentId,
  docType,
  docVariant,
  family,
  buttonLabel,
}: {
  contractId: string;
  shipmentId?: string;
  docType: DocumentType;
  docVariant?: DocumentVariant;
  family?: DocumentFamily;
  buttonLabel?: string;
}) {
  const toast = useToast();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
      setError(null);
    try {
      const templateLayout = readTemplateLayoutForDocType(docType, docVariant);

      const data = await apiClient<{ docId: string }>("/api/documents/generate", {
        method: "POST",
        body: JSON.stringify({
          orgId: DEFAULT_ORG_ID,
          contractId,
          shipmentId,
          docType,
          docVariant,
          templateVersion: "v1",
          ...(templateLayout ? { templateLayout } : {}),
        }),
      });

      const familyQuery = family ? `?family=${encodeURIComponent(family)}` : "";
      toast.success("Document generated.");
      router.push(`/app/contracts/${encodeURIComponent(contractId)}/documents/generated/${data.docId}/review${familyQuery}`);
    } catch (generateError) {
      setError((generateError as Error).message);
      toast.error("Unable to generate document.");
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
  const toast = useToast();
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
      toast.success("Submitted for review.");
      router.refresh();
    } catch (submitError) {
      setError((submitError as Error).message);
      toast.error("Unable to submit for review.");
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
      toast.success(decision === "approve" ? "Approved." : "Rejected.");
      router.refresh();
    } catch (decisionError) {
      setError((decisionError as Error).message);
      toast.error("Unable to record decision.");
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
      toast.success("Marked as final.");
      router.refresh();
    } catch (markError) {
      setError((markError as Error).message);
      toast.error("Unable to mark final.");
    } finally {
      setBusy(null);
    }
  }

  const normalizedStatus = (status ?? "").toLowerCase();
  const canMarkFinal = normalizedStatus === "approved";

  return (
    <section className="form-workspace">
      <FormSection title="Workflow Actions" description="Submit, approve, reject, or mark this document as final.">
        <div className="document-workflow-actions">
          <button type="button" className="button-secondary" onClick={submitForReview} disabled={busy !== null}>
            {busy === "submit" ? "Submitting..." : "Submit for Review"}
          </button>

          <button type="button" className="button-secondary" onClick={markFinal} disabled={busy !== null || isFinal || !canMarkFinal}>
            {isFinal
              ? "Already Final"
              : !canMarkFinal
                ? "Approve to Mark Final"
                : busy === "markFinal"
                  ? "Marking..."
                  : "Mark as Final"}
          </button>
        </div>

        <label className="col-12">
          Decision Comment
          <textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={6} />
        </label>
      </FormSection>

      {error ? <p className="error-text">{error}</p> : null}

      <FormActionBar>
        <button type="button" onClick={() => decide("approve")} disabled={busy !== null}>
          {busy === "approve" ? "Approving..." : "Approve"}
        </button>
        <button type="button" className="button-secondary" onClick={() => decide("reject")} disabled={busy !== null}>
          {busy === "reject" ? "Rejecting..." : "Reject"}
        </button>
      </FormActionBar>
    </section>
  );
}

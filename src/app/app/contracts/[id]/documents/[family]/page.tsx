"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GenerateDocumentButton } from "@/components/forms/document-actions";
import { apiClient } from "@/lib/api/client";
import { DEFAULT_ORG_ID } from "@/lib/config";
import { defaultVariantForFamily } from "@/domain/documents/catalog";
import type { DocumentFamily, DocumentOutputSnapshot, DocumentType, DocumentVariant } from "@/types/models";

type FamilyPayload = {
  family: DocumentFamily;
  familyLabel: string;
  docType: DocumentType;
  variant: DocumentVariant;
  variantLabel: string;
  availableVariants: Array<{ value: DocumentVariant; label: string }>;
  latestShipmentId: string | null;
  currentPreview: DocumentOutputSnapshot | null;
  previewWarnings: string[];
  unavailableReason: string | null;
  revisions: Array<{
    id: string;
    title: string;
    status: string;
    revisionNumber: number;
    generatedAt: string;
    docVariant: DocumentVariant;
  }>;
  familyRevisionCount: number;
};

function renderValue(value: string) {
  return value && value.trim() !== "" ? value : "-";
}

export default function ContractDocumentFamilyPage({
  params,
}: {
  params: Promise<{ id: string; family: DocumentFamily }>;
}) {
  const [contractId, setContractId] = useState("");
  const [family, setFamily] = useState<DocumentFamily>("commercial_invoice");
  const [variant, setVariant] = useState<DocumentVariant>("final");
  const [payload, setPayload] = useState<FamilyPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    Promise.resolve(params)
      .then(async ({ id, family }) => {
        if (!mounted) {
          return;
        }

        setContractId(id);
        setFamily(family);
        const initialVariant = defaultVariantForFamily(family);
        setVariant(initialVariant);
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
    if (!contractId) {
      return;
    }

    let mounted = true;

    apiClient<FamilyPayload>(
      `/api/contracts/${contractId}/document-family?orgId=${DEFAULT_ORG_ID}&family=${family}&variant=${variant}`,
    )
      .then((data) => {
        if (mounted) {
          setPayload(data);
          setError(null);
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
  }, [contractId, family, variant]);

  if (error) {
    return <section className="card"><p className="error-text">{error}</p></section>;
  }

  if (!payload) {
    return <section className="card"><p>Loading document family...</p></section>;
  }

  return (
    <section className="page-shell">
      <header className="page-header">
        <h1>{payload.familyLabel}</h1>
        <p>Current preview is rebuilt from the latest resolved contract state. Generated revisions remain immutable history.</p>
        <div className="row-actions" style={{ marginTop: "0.75rem" }}>
          {payload.availableVariants.map((option) => (
            <button
              key={option.value}
              type="button"
              className={variant === option.value ? "workspace-tab active" : "workspace-tab"}
              onClick={() => setVariant(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </header>

      <section className="document-detail-grid">
        <section className="card">
          <div className="section-heading">
            <div>
              <h3>Current Preview</h3>
              <p className="sidebar-subtitle">{payload.variantLabel} variant based on current contract data.</p>
            </div>
            <span className="source-badge source-lc">{payload.familyRevisionCount} total rev</span>
          </div>

          {payload.unavailableReason ? (
            <p>{payload.unavailableReason}</p>
          ) : payload.currentPreview ? (
            <>
              {payload.previewWarnings.length > 0 ? (
                <div style={{ marginBottom: "0.9rem" }}>
                  <strong>Warnings</strong>
                  <ul style={{ paddingLeft: "1rem", marginTop: "0.35rem" }}>
                    {payload.previewWarnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {payload.currentPreview.sections.map((section) => (
                <div key={section.heading} className="preview-section">
                  <h4>{section.heading}</h4>
                  <table>
                    <tbody>
                      {section.rows.map((row) => (
                        <tr key={`${section.heading}-${row.label}`}>
                          <th>{row.label}</th>
                          <td>{renderValue(row.value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </>
          ) : null}
        </section>

        <section className="page-shell">
          <GenerateDocumentButton
            contractId={contractId}
            shipmentId={payload.latestShipmentId ?? undefined}
            docType={payload.docType}
            docVariant={payload.variant}
            buttonLabel={`Generate ${payload.familyLabel} ${payload.variantLabel} Revision`}
          />

          <section className="card">
            <div className="section-heading">
              <div>
                <h3>Revision History</h3>
                <p className="sidebar-subtitle">Previous generated versions for this variant.</p>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Revision</th>
                  <th>Status</th>
                  <th>Generated</th>
                  <th>Open</th>
                </tr>
              </thead>
              <tbody>
                {payload.revisions.length === 0 ? (
                  <tr><td colSpan={4}>No revisions yet.</td></tr>
                ) : (
                  payload.revisions.map((revision) => (
                    <tr key={revision.id}>
                      <td>v{revision.revisionNumber}</td>
                      <td>{revision.status}</td>
                      <td>{new Date(revision.generatedAt).toLocaleString()}</td>
                      <td>
                        <Link href={`/app/contracts/${contractId}/documents/generated/${revision.id}/review`}>Open</Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>
        </section>
      </section>
    </section>
  );
}

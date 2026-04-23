"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GenerateDocumentButton } from "@/components/forms/document-actions";
import { apiClient } from "@/lib/api/client";
import { DEFAULT_ORG_ID } from "@/lib/config";
import type { DocumentFamily, DocumentOutputSnapshot, DocumentType } from "@/types/models";

type FamilyPayload = {
  family: DocumentFamily;
  familyLabel: string;
  docType: DocumentType;
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
    isFinal: boolean;
  }>;
  documentRevisionCount: number;
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
  const [payload, setPayload] = useState<FamilyPayload | null>(null);
  const [activeWayBillTab, setActiveWayBillTab] = useState(0);
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
      `/api/contracts/${contractId}/document-family?orgId=${DEFAULT_ORG_ID}&family=${family}`,
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
  }, [contractId, family]);

  if (error) {
    return <section className="card"><p className="error-text">{error}</p></section>;
  }

  if (!payload) {
    return <section className="card"><p>Loading document...</p></section>;
  }

  const wayBillSections = payload.currentPreview?.sections.filter((section) => section.heading.startsWith("Driver ")) ?? [];
  const safeWayBillTabIndex = activeWayBillTab < wayBillSections.length ? activeWayBillTab : 0;
  const activeWayBillSection = wayBillSections[safeWayBillTabIndex];

  return (
    <section className="page-shell">
      <header className="page-header">
        <h1>{payload.familyLabel}</h1>
        <p>Current preview is rebuilt from the latest resolved contract state. Each generation creates a new immutable revision.</p>
      </header>

      <section className="document-detail-grid">
        <section className="card">
          <div className="section-heading">
            <div>
              <h3>Current Preview</h3>
              <p className="sidebar-subtitle">Latest draft preview based on current resolved data.</p>
            </div>
            <span className="source-badge source-lc">{payload.documentRevisionCount} total rev</span>
          </div>

          {payload.unavailableReason ? (
            <p>{payload.unavailableReason}</p>
          ) : payload.currentPreview ? (
            <>
              {payload.previewWarnings.length > 0 ? (
                <div className="mt-md">
                  <strong>Warnings</strong>
                  <ul className="list-indent mt-sm">
                    {payload.previewWarnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {payload.docType === "way_bill" && wayBillSections.length > 0 ? (
                <>
                  <div className="workspace-tabs">
                    {wayBillSections.map((section, index) => (
                      <button
                        key={section.heading}
                        type="button"
                        className={index === safeWayBillTabIndex ? "" : "button-secondary"}
                        onClick={() => setActiveWayBillTab(index)}
                      >
                        {section.heading.replace(/^Driver\s+\d+\s+-\s+/, "")}
                      </button>
                    ))}
                  </div>

                  {activeWayBillSection ? (
                    <div className="preview-section">
                      <h4>{activeWayBillSection.heading}</h4>
                      <div className="table-wrap">
                        <table>
                          <tbody>
                            {activeWayBillSection.rows.map((row) => (
                              <tr key={`${activeWayBillSection.heading}-${row.label}`}>
                                <th className="wrap">{row.label}</th>
                                <td className="wrap">{renderValue(row.value)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : null}
                </>
              ) : (
                payload.currentPreview.sections.map((section) => (
                  <div key={section.heading} className="preview-section">
                    <h4>{section.heading}</h4>
                    <div className="table-wrap">
                      <table>
                        <tbody>
                          {section.rows.map((row) => (
                            <tr key={`${section.heading}-${row.label}`}>
                              <th className="wrap">{row.label}</th>
                              <td className="wrap">{renderValue(row.value)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))
              )}
            </>
          ) : null}
        </section>

        <section className="page-shell">
          <GenerateDocumentButton
            contractId={contractId}
            shipmentId={payload.latestShipmentId ?? undefined}
            docType={payload.docType}
            buttonLabel={`Generate New ${payload.familyLabel} Revision`}
          />

          <section className="card">
            <div className="section-heading">
              <div>
                <h3>Revision History</h3>
                <p className="sidebar-subtitle">Previous generated versions for this document.</p>
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Revision</th>
                    <th>Version</th>
                    <th>Status</th>
                    <th>Generated</th>
                    <th>Open</th>
                  </tr>
                </thead>
                <tbody>
                  {payload.revisions.length === 0 ? (
                    <tr><td colSpan={5}>No revisions yet.</td></tr>
                  ) : (
                    payload.revisions.map((revision) => (
                      <tr key={revision.id}>
                        <td>v{revision.revisionNumber}</td>
                        <td>
                          <span className={`status-pill ${revision.isFinal ? "status-approved" : "status-draft"}`}>
                            {revision.isFinal ? "Final" : "Draft"}
                          </span>
                        </td>
                        <td>
                          <span className={`status-pill status-${revision.status.toLowerCase().replace(/\s+/g, "-")}`}>
                            {revision.status}
                          </span>
                        </td>
                        <td>{new Date(revision.generatedAt).toLocaleString()}</td>
                        <td>
                          <Link
                            href={`/app/contracts/${contractId}/documents/generated/${revision.id}/review`}
                            className="button-link button-link-secondary"
                          >
                            Open
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      </section>
    </section>
  );
}

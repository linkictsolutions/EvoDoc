"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CenteredLoader } from "@/components/ui/centered-loader";
import { apiClient } from "@/lib/api/client";
import { DEFAULT_ORG_ID } from "@/lib/config";
import { getMissingSourceSteps, getSourceDocumentProgress } from "@/domain/contract-readiness";
import type { Contract, Customer } from "@/types/models";

type ContractDetail = {
  contract: Contract;
  customer: Customer | null;
  shipments: Array<{ id: string; status: string; updatedAt: string }>;
  documents: Array<{ id: string; docType: string; status: string; updatedAt: string }>;
  executionData?: {
    bookings?: { entries?: Array<unknown> };
    staffing?: { finalRows?: Array<unknown> };
    processing?: { stationName?: string };
  };
};

const workspaceLinks = [
  {
    key: "inputs",
    title: "Source Documents",
    description: "Contract, shipping, bank & LC, and MSC B/L records.",
    href: (id: string) => `/app/contracts/${id}/inputs/contract`,
    cta: "Open",
  },
  {
    key: "resolved",
    title: "Resolved Values",
    description: "Final field precedence after LC and SI overrides.",
    href: (id: string) => `/app/contracts/${id}/resolved-values`,
    cta: "Review",
  },
  {
    key: "execution",
    title: "Execution",
    description: "Bookings, staffing, and processing execution data.",
    href: (id: string) => `/app/contracts/${id}/execution/bookings`,
    cta: "Open",
  },
  {
    key: "documents",
    title: "Documents",
    description: "Generate, review, approve, and print export documents.",
    href: (id: string) => `/app/contracts/${id}/documents`,
    cta: "Generate",
  },
  {
    key: "activity",
    title: "Activity",
    description: "Audit trail of writes and workflow events.",
    href: (id: string) => `/app/contracts/${id}/activity`,
    cta: "View",
  },
] as const;

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [state, setState] = useState<ContractDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [contractId, setContractId] = useState<string>("");

  useEffect(() => {
    let mounted = true;

    Promise.resolve(params)
      .then(({ id }) => {
        if (!mounted) {
          return;
        }
        setContractId(id);
        return apiClient<ContractDetail>(`/api/contracts/${id}?orgId=${DEFAULT_ORG_ID}`);
      })
      .then((data) => {
        if (mounted && data) {
          setState(data);
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

  const sourceProgress = useMemo(
    () => (state ? getSourceDocumentProgress(state.contract) : null),
    [state],
  );

  if (error) {
    return <section className="card"><p className="error-text">{error}</p></section>;
  }

  if (!state || !sourceProgress) {
    return (
      <section className="page-shell">
        <CenteredLoader label="Loading contract workspace..." scope="page" />
      </section>
    );
  }

  const hasBookings = Boolean(state.executionData?.bookings?.entries?.length);
  const hasStaffing = Boolean(state.executionData?.staffing?.finalRows?.length);
  const hasProcessing = Boolean(state.executionData?.processing?.stationName);
  const executionComplete = [hasBookings, hasStaffing, hasProcessing].filter(Boolean).length;
  const missingSourceSteps = getMissingSourceSteps(state.contract);
  const pendingReviews = state.documents.filter((document) => document.status === "under_review").length;
  const encodedContractId = encodeURIComponent(contractId);

  return (
    <section className="page-shell contract-overview-shell">
      <header className="page-header contract-overview-hero">
        <div className="contract-overview-hero-copy">
          <p className="dashboard-eyebrow">Contract Workspace</p>
          <div className="contract-overview-title-row">
            <h1>{state.contract.contractNumber}</h1>
            <span className={`status-pill status-${state.contract.status.toLowerCase().replace(/\s+/g, "-")}`}>
              {state.contract.status}
            </span>
          </div>
          <p>
            {state.customer?.name ?? state.contract.customerId}
            {" · "}
            Last updated {formatTimestamp(state.contract.updatedAt)}
          </p>
        </div>
        <div className="row-actions page-header-actions contract-overview-hero-actions">
          <Link href={`/app/contracts/${encodedContractId}/documents`}>
            <button type="button">Open Documents</button>
          </Link>
          <Link href={`/app/contracts/${encodedContractId}/inputs/contract`}>
            <button type="button" className="button-secondary">Source Documents</button>
          </Link>
        </div>
      </header>

      <section className="dashboard-grid" aria-label="Contract metrics">
        <article className="metric-card">
          <p className="metric-label">Source Documents</p>
          <strong className="metric-value">{sourceProgress.completed}/{sourceProgress.total}</strong>
          <span className="metric-subvalue">
            {missingSourceSteps.length > 0 ? `${missingSourceSteps.length} still needed` : "source inputs complete"}
          </span>
        </article>
        <article className="metric-card">
          <p className="metric-label">Execution</p>
          <strong className="metric-value">{executionComplete}/3</strong>
          <span className="metric-subvalue">bookings, staffing, processing</span>
        </article>
        <article className="metric-card">
          <p className="metric-label">Documents</p>
          <strong className="metric-value">{state.documents.length}</strong>
          <span className="metric-subvalue">{pendingReviews} pending review</span>
        </article>
        <article className="metric-card">
          <p className="metric-label">Shipments</p>
          <strong className="metric-value">{state.shipments.length}</strong>
          <span className="metric-subvalue">linked shipment records</span>
        </article>
      </section>

      <div className="dashboard-columns contract-overview-columns">
        <section className="card dashboard-panel">
          <div className="section-heading">
            <div>
              <h3>Source Document Progress</h3>
              <p className="sidebar-subtitle">Complete each input before generating export documents.</p>
            </div>
          </div>
          <ul className="contract-progress-list">
            {sourceProgress.steps.map((step) => (
              <li key={step.key} className={step.complete ? "contract-progress-item is-complete" : "contract-progress-item"}>
                <div className="contract-progress-copy">
                  <strong>{step.label}</strong>
                  <p>{step.complete ? "Ready" : "Needs input"}</p>
                </div>
                <Link
                  href={`/app/contracts/${encodedContractId}/${step.hrefSuffix}`}
                  className="button-link button-link-secondary"
                >
                  {step.complete ? "Open" : "Complete"}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="card dashboard-panel">
          <div className="section-heading">
            <div>
              <h3>Workspace Areas</h3>
              <p className="sidebar-subtitle">Jump directly into the part of the contract you need.</p>
            </div>
          </div>
          <div className="contract-workspace-grid">
            {workspaceLinks.map((link) => (
              <article key={link.key} className="contract-workspace-card">
                <h4>{link.title}</h4>
                <p>{link.description}</p>
                <Link href={link.href(encodedContractId)} className="button-link button-link-secondary">
                  {link.cta}
                </Link>
              </article>
            ))}
          </div>
        </section>
      </div>

      {state.documents.length > 0 ? (
        <section className="card dashboard-panel">
          <div className="section-heading">
            <div>
              <h3>Recent Document Activity</h3>
              <p className="sidebar-subtitle">Latest generated outputs for this contract.</p>
            </div>
            <Link href={`/app/contracts/${encodedContractId}/documents`}>View all</Link>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Status</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {state.documents.slice(0, 5).map((document) => (
                  <tr key={document.id}>
                    <td>{document.docType.replace(/_/g, " ")}</td>
                    <td>
                      <span className={`status-pill status-${document.status.toLowerCase().replace(/\s+/g, "-")}`}>
                        {document.status}
                      </span>
                    </td>
                    <td>{formatTimestamp(document.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </section>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api/client";
import { DEFAULT_ORG_ID } from "@/lib/config";

type ContractDetail = {
  contract: {
    id: string;
    contractNumber: string;
    status: string;
    customerId: string;
    updatedAt: string;
  };
  shipments: Array<{ id: string; status: string; updatedAt: string }>;
  documents: Array<{ id: string; docType: string; status: string; updatedAt: string }>;
  executionData?: {
    bookings?: { entries?: Array<unknown> };
    staffing?: { finalRows?: Array<unknown> };
    processing?: { stationName?: string };
  };
};

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

  if (error) {
    return <section className="card"><p className="error-text">{error}</p></section>;
  }

  if (!state) {
    return <section className="card"><p>Loading contract...</p></section>;
  }

  const hasBookings = Boolean(state.executionData?.bookings?.entries?.length);
  const hasStaffing = Boolean(state.executionData?.staffing?.finalRows?.length);
  const hasProcessing = Boolean(state.executionData?.processing?.stationName);

  return (
    <section className="page-shell">
      <header className="page-header">
        <h1>Contract Overview</h1>
        <p>Parent workspace for one coffee export contract and all of its source documents, execution records, and output documents.</p>
      </header>

      <section className="dashboard-grid">
        <article className="metric-card">
          <p className="metric-label">Contract</p>
          <strong className="metric-value contract-metric">{state.contract.contractNumber}</strong>
          <span className="metric-subvalue">{state.contract.status}</span>
        </article>
        <article className="metric-card">
          <p className="metric-label">Execution</p>
          <strong className="metric-value">{[hasBookings, hasStaffing, hasProcessing].filter(Boolean).length}/3</strong>
          <span className="metric-subvalue">bookings, staffing, processing</span>
        </article>
        <article className="metric-card">
          <p className="metric-label">Documents</p>
          <strong className="metric-value">{state.documents.length}</strong>
          <span className="metric-subvalue">generated outputs</span>
        </article>
        <article className="metric-card">
          <p className="metric-label">Last Updated</p>
          <strong className="metric-value metric-date">{new Date(state.contract.updatedAt).toLocaleDateString()}</strong>
          <span className="metric-subvalue">{new Date(state.contract.updatedAt).toLocaleTimeString()}</span>
        </article>
      </section>

      <section className="card">
        <h2>Next Actions</h2>
        <div className="row-actions page-header-actions">
          <Link href={`/app/contracts/${contractId}/inputs/contract`}>
            <button type="button">Open Source Documents</button>
          </Link>
          <Link href={`/app/contracts/${contractId}/resolved-values`}>
            <button type="button" className="button-secondary">Review Resolved Values</button>
          </Link>
          <Link href={`/app/contracts/${contractId}/documents`}>
            <button type="button" className="button-secondary">Open Documents</button>
          </Link>
          <Link href={`/app/contracts/${contractId}/execution/bookings`}>
            <button type="button" className="button-secondary">Open Execution</button>
          </Link>
        </div>
      </section>

      <section className="card">
        <h2>Workspace Structure</h2>
        <ul className="journey-list">
          <li><strong>Source Documents</strong>: Contract, Shipping Instruction, and Bank &amp; LC source records.</li>
          <li><strong>Resolved Values</strong>: final field precedence after LC/SI overrides.</li>
          <li><strong>Execution</strong>: Bookings, Staffing, and Processing workbook sheets attached to this contract.</li>
          <li><strong>Documents</strong>: generated Commercial Invoice (ICC), Packing List (ICC), Shipping Instruction, and certificate outputs.</li>
          <li><strong>Activity</strong>: audit trail of writes and workflow events.</li>
        </ul>
      </section>
    </section>
  );
}

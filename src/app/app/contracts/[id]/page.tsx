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

  const latestShipment = state.shipments[0]?.id;

  return (
    <section className="page-shell">
      <header className="page-header">
        <h1>Contract Overview</h1>
        <p>Parent workspace for one coffee export contract and all of its source inputs, execution records, and output documents.</p>
      </header>

      <section className="dashboard-grid">
        <article className="metric-card">
          <p className="metric-label">Contract</p>
          <strong className="metric-value contract-metric">{state.contract.contractNumber}</strong>
          <span className="metric-subvalue">{state.contract.status}</span>
        </article>
        <article className="metric-card">
          <p className="metric-label">Shipments</p>
          <strong className="metric-value">{state.shipments.length}</strong>
          <span className="metric-subvalue">execution records</span>
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
        <div className="row-actions" style={{ marginTop: "0.75rem" }}>
          <Link href={`/app/contracts/${contractId}/inputs/contract`}>
            <button type="button">Open Inputs</button>
          </Link>
          <Link href={`/app/contracts/${contractId}/resolved-values`}>
            <button type="button">Review Resolved Values</button>
          </Link>
          <Link href={`/app/contracts/${contractId}/documents`}>
            <button type="button">Open Documents</button>
          </Link>
          {latestShipment ? (
            <>
              <Link href={`/app/contracts/${contractId}/documents/template/invoice/draft?shipmentId=${latestShipment}`}>
                <button type="button">Invoice Draft</button>
              </Link>
              <Link href={`/app/contracts/${contractId}/documents/template/packing_list/draft?shipmentId=${latestShipment}`}>
                <button type="button">Packing Draft</button>
              </Link>
              <Link href={`/app/contracts/${contractId}/documents/template/shipping_instructions/draft?shipmentId=${latestShipment}`}>
                <button type="button">SI Draft</button>
              </Link>
            </>
          ) : (
            <Link href={`/app/contracts/${contractId}/shipments/new`}>
              <button type="button">Add First Shipment</button>
            </Link>
          )}
        </div>
      </section>

      <section className="card">
        <h2>Workspace Structure</h2>
        <div className="journey-list">
          <p><strong>Inputs</strong>: Contract, Shipping Instruction, and Bank &amp; LC source sheets.</p>
          <p><strong>Resolved Values</strong>: final field precedence after LC/SI overrides.</p>
          <p><strong>Shipments</strong>: booking and execution records attached to this contract.</p>
          <p><strong>Documents</strong>: generated invoice, packing list, SI, and sample outputs.</p>
          <p><strong>Activity</strong>: audit trail of writes and workflow events.</p>
        </div>
      </section>
    </section>
  );
}

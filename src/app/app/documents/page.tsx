"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiClient } from "@/lib/api/client";
import { DEFAULT_ORG_ID } from "@/lib/config";
import { CenteredLoader } from "@/components/ui/centered-loader";
import {
  contractStatusClass,
  formatDocumentSummaryLabel,
  formatListTimestamp,
} from "@/lib/contracts/list-display";
import type { Contract, ContractDocumentSummary, Customer } from "@/types/models";

export default function DocumentsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [documentSummaries, setDocumentSummaries] = useState<Record<string, ContractDocumentSummary>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    Promise.all([
      apiClient<Contract[]>(`/api/contracts?orgId=${DEFAULT_ORG_ID}`),
      apiClient<Customer[]>(`/api/customers?orgId=${DEFAULT_ORG_ID}`),
      apiClient<Record<string, ContractDocumentSummary>>(`/api/contracts/document-summaries?orgId=${DEFAULT_ORG_ID}`),
    ])
      .then(([contractData, customerData, summaryData]) => {
        if (mounted) {
          setContracts(contractData);
          setCustomers(customerData);
          setDocumentSummaries(summaryData);
        }
      })
      .catch((loadError: Error) => {
        if (mounted) {
          setError(loadError.message);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const customerNameById = useMemo(
    () => new Map(customers.map((customer) => [customer.id, customer.name])),
    [customers],
  );

  return (
    <section className="page-shell">
      <header className="page-header">
        <h1>Documents</h1>
        <p>Generated documents are organized by contract so every revision stays tied to its source data and audit trail.</p>
        <div className="row-actions page-header-actions">
          <Link href="/app/contracts">
            <button type="button">Open Contracts</button>
          </Link>
        </div>
      </header>

      {error ? <section className="card"><p className="error-text">{error}</p></section> : null}

      <section className="card">
        <div className="section-heading">
          <div>
            <h2>Open Contract Documents</h2>
            <p className="sidebar-subtitle">Choose a contract to generate, review, approve, and print document revisions.</p>
          </div>
        </div>

        {loading ? (
          <CenteredLoader label="Loading contracts..." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Contract #</th>
                  <th>Buyer</th>
                  <th>Status</th>
                  <th>Documents</th>
                  <th>Last updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {contracts.length === 0 ? (
                  <tr>
                    <td colSpan={6}>No contracts yet.</td>
                  </tr>
                ) : (
                  contracts.map((contract) => {
                    const summary = documentSummaries[contract.id] ?? {
                      revisionCount: 0,
                      latestUpdatedAt: null,
                      pendingReviewCount: 0,
                      latestStatus: null,
                    };
                    const lastUpdated = summary.latestUpdatedAt ?? contract.updatedAt;

                    return (
                      <tr key={contract.id}>
                        <td>{contract.contractNumber}</td>
                        <td>{customerNameById.get(contract.customerId) ?? "—"}</td>
                        <td>
                          <span className={contractStatusClass(contract.status)}>
                            {contract.status}
                          </span>
                        </td>
                        <td className="wrap">
                          <span className={summary.pendingReviewCount > 0 ? "status-pill status-under-review" : undefined}>
                            {formatDocumentSummaryLabel(summary)}
                          </span>
                        </td>
                        <td>{formatListTimestamp(lastUpdated)}</td>
                        <td>
                          <Link
                            href={`/app/contracts/${encodeURIComponent(contract.contractNumber)}/documents`}
                            className="button-link button-link-secondary"
                          >
                            Open Documents
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}

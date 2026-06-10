"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api/client";
import { DEFAULT_ORG_ID } from "@/lib/config";
import { CenteredLoader } from "@/components/ui/centered-loader";
import type { Contract } from "@/types/models";

export default function DocumentsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    apiClient<Contract[]>(`/api/contracts?orgId=${DEFAULT_ORG_ID}`)
      .then((data) => {
        if (mounted) {
          setContracts(data);
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
                  <th>Status</th>
                  <th>Buyer ID</th>
                  <th>Documents</th>
                </tr>
              </thead>
              <tbody>
                {contracts.length === 0 ? (
                  <tr>
                    <td colSpan={4}>No contracts yet.</td>
                  </tr>
                ) : (
                  contracts.map((contract) => (
                    <tr key={contract.id}>
                      <td>{contract.contractNumber}</td>
                      <td>
                        <span className={`status-pill status-${contract.status.toLowerCase().replace(/\s+/g, "-")}`}>
                          {contract.status}
                        </span>
                      </td>
                      <td>{contract.customerId}</td>
                      <td>
                        <Link
                          href={`/app/contracts/${encodeURIComponent(contract.contractNumber)}/documents`}
                          className="button-link button-link-secondary"
                        >
                          Open Documents
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}

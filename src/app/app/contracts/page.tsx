"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api/client";
import { DEFAULT_ORG_ID } from "@/lib/config";
import type { Contract } from "@/types/models";

export default function ContractsPage() {
  const [items, setItems] = useState<Contract[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    apiClient<Contract[]>(`/api/contracts?orgId=${DEFAULT_ORG_ID}`)
      .then((data) => {
        if (mounted) {
          setItems(data);
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
  }, []);

  return (
    <section className="page-shell">
      <header className="page-header">
        <h1>Contracts</h1>
        <p>Manage contracts and launch document workflows.</p>
        <div className="row-actions page-header-actions">
          <Link href="/app/contracts/new">
            <button type="button">New Contract</button>
          </Link>
        </div>
      </header>

      <section className="card">
        {error ? <p className="error-text">{error}</p> : null}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Contract #</th>
                <th>Status</th>
                <th>Buyer ID</th>
                <th>Updated</th>
                <th>Open</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5}>No contracts yet.</td>
                </tr>
              ) : (
                items.map((contract) => (
                  <tr key={contract.id}>
                    <td>{contract.contractNumber}</td>
                    <td>
                      <span className={`status-pill status-${contract.status.toLowerCase().replace(/\\s+/g, "-")}`}>
                        {contract.status}
                      </span>
                    </td>
                    <td>{contract.customerId}</td>
                    <td>{new Date(contract.updatedAt).toLocaleString()}</td>
                    <td>
                      <Link href={`/app/contracts/${contract.id}`}>Open</Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}

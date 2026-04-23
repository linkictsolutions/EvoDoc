"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api/client";
import { DEFAULT_ORG_ID } from "@/lib/config";
import type { Contract, Customer, Notification } from "@/types/models";

function countDraftContracts(contracts: Contract[]) {
  return contracts.filter((contract) => contract.status === "draft").length;
}

export function OperationsDashboard() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    Promise.all([
      apiClient<Contract[]>(`/api/contracts?orgId=${DEFAULT_ORG_ID}`),
      apiClient<Customer[]>(`/api/customers?orgId=${DEFAULT_ORG_ID}`),
      apiClient<Notification[]>(`/api/notifications?orgId=${DEFAULT_ORG_ID}`),
    ])
      .then(([contractData, customerData, notificationData]) => {
        if (!mounted) {
          return;
        }

        setContracts(contractData);
        setCustomers(customerData);
        setNotifications(notificationData);
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

  const recentContracts = contracts.slice(0, 5);
  const openReviews = notifications.filter((notification) => notification.type === "review_requested").length;

  return (
    <section className="page-shell">
      <header className="page-header">
        <h1>Operations Overview</h1>
        <p>Run export work from contracts outward: master data, source documents, resolved values, shipments, and documents.</p>
        <div className="row-actions page-header-actions">
          <Link href="/app/contracts">
            <button type="button">Open Contracts</button>
          </Link>
          <Link href="/app/contracts/new">
            <button type="button">New Export Contract</button>
          </Link>
        </div>
      </header>

      {error ? <section className="card"><p className="error-text">{error}</p></section> : null}

      <section className="dashboard-grid">
        <article className="metric-card">
          <p className="metric-label">Contracts</p>
          <strong className="metric-value">{contracts.length}</strong>
          <span className="metric-subvalue">{countDraftContracts(contracts)} draft</span>
        </article>
        <article className="metric-card">
          <p className="metric-label">Buyers</p>
          <strong className="metric-value">{customers.length}</strong>
          <span className="metric-subvalue">master records</span>
        </article>
        <article className="metric-card">
          <p className="metric-label">Pending Review</p>
          <strong className="metric-value">{openReviews}</strong>
          <span className="metric-subvalue">document tasks</span>
        </article>
      </section>

      <div className="dashboard-columns">
        <section className="card">
          <div className="section-heading">
            <div>
              <h3>Recommended Journey</h3>
              <p className="sidebar-subtitle">The app should follow the real export operation, not the spreadsheet layout.</p>
            </div>
          </div>
          <ol className="journey-list">
            <li>Create or reuse buyer master records.</li>
            <li>Create one export contract as the parent workspace.</li>
            <li>Complete the three source documents: Contract, Shipping Instruction, Bank &amp; LC.</li>
            <li>Review resolved values where LC or SI overrides contract terms.</li>
            <li>Add shipment and booking details, then generate the required documents.</li>
            <li>Review, approve, print, and track the export record to completion.</li>
          </ol>
        </section>

        <section className="card">
          <div className="section-heading">
            <div>
              <h3>Recent Contracts</h3>
              <p className="sidebar-subtitle">Most recent parent records in the system.</p>
            </div>
            <Link href="/app/contracts">View all</Link>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Contract</th>
                  <th>Status</th>
                  <th>Buyer</th>
                  <th>Open</th>
                </tr>
              </thead>
              <tbody>
                {recentContracts.length === 0 ? (
                  <tr>
                    <td colSpan={4}>No contracts yet.</td>
                  </tr>
                ) : (
                  recentContracts.map((contract) => (
                    <tr key={contract.id}>
                      <td>{contract.contractNumber}</td>
                      <td>
                        <span className={`status-pill status-${contract.status.toLowerCase().replace(/\\s+/g, "-")}`}>
                          {contract.status}
                        </span>
                      </td>
                      <td>{contract.customerId}</td>
                      <td>
                        <Link
                          href={`/app/contracts/${encodeURIComponent(contract.contractNumber)}`}
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
      </div>
    </section>
  );
}

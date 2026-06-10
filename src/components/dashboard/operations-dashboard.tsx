"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CenteredLoader } from "@/components/ui/centered-loader";
import { apiClient } from "@/lib/api/client";
import { DEFAULT_ORG_ID } from "@/lib/config";
import type { Contract, Customer, Notification } from "@/types/models";

function countContractsByStatus(contracts: Contract[], status: Contract["status"]) {
  return contracts.filter((contract) => contract.status === status).length;
}

function getMissingSourceSteps(contract: Contract): string[] {
  const missing: string[] = [];

  if (!contract.terms?.quality?.trim() || !contract.terms?.quantityBags) {
    missing.push("Contract");
  }

  if (
    !contract.shipping?.destinationPort?.trim()
    || !contract.shipping?.portOfLoading?.trim()
    || !contract.shipping?.shippingLine?.trim()
  ) {
    missing.push("Shipping Instruction");
  }

  if (!contract.banking?.lcNumber?.trim() && !contract.banking?.beneficiaryBank?.trim()) {
    missing.push("Bank & LC");
  }

  return missing;
}

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

function MetricSkeleton() {
  return (
    <div className="dashboard-metric-skeleton" aria-hidden="true">
      <span className="dashboard-skeleton-line dashboard-skeleton-line-short" />
      <span className="dashboard-skeleton-line dashboard-skeleton-line-value" />
      <span className="dashboard-skeleton-line dashboard-skeleton-line-medium" />
    </div>
  );
}

export function OperationsDashboard() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [continueContractNumber] = useState<string | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }

    return window.localStorage.getItem("evodoc.contractId");
  });

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

  const draftCount = countContractsByStatus(contracts, "draft");
  const activeCount = countContractsByStatus(contracts, "active");
  const reviewTasks = notifications.filter((notification) => notification.type === "review_requested");
  const incompleteContracts = contracts
    .map((contract) => ({
      contract,
      missing: getMissingSourceSteps(contract),
    }))
    .filter((entry) => entry.missing.length > 0)
    .slice(0, 5);

  const continueContract = contracts.find(
    (contract) => contract.contractNumber === continueContractNumber || contract.id === continueContractNumber,
  );

  const recentContracts = contracts.slice(0, 6);
  const attentionCount = reviewTasks.length + incompleteContracts.length;

  return (
    <section className="page-shell dashboard-shell">
      <header className="page-header dashboard-hero">
        <div className="dashboard-hero-copy">
          <p className="dashboard-eyebrow">Operations Dashboard</p>
          <h1>Overview</h1>
          <p>Track export contracts, resolve blockers, and jump back into the work that needs attention.</p>
        </div>
        <div className="row-actions page-header-actions dashboard-hero-actions">
          <Link href="/app/contracts/new">
            <button type="button">New Export Contract</button>
          </Link>
          <Link href="/app/contracts">
            <button type="button" className="button-secondary">Open Contracts</button>
          </Link>
        </div>
      </header>

      {error ? <section className="card"><p className="error-text">{error}</p></section> : null}

      {!loading && continueContract ? (
        <section className="card dashboard-continue-card">
          <div className="dashboard-continue-copy">
            <p className="dashboard-eyebrow">Continue where you left off</p>
            <h2>{continueContract.contractNumber}</h2>
            <p className="sidebar-subtitle">
              {customerNameById.get(continueContract.customerId) ?? continueContract.customerId}
              {" · "}
              Updated {formatTimestamp(continueContract.updatedAt)}
            </p>
          </div>
          <div className="row-actions dashboard-continue-actions">
            <Link href={`/app/contracts/${encodeURIComponent(continueContract.contractNumber)}`}>
              <button type="button">Open Contract</button>
            </Link>
            <Link href={`/app/contracts/${encodeURIComponent(continueContract.contractNumber)}/documents`}>
              <button type="button" className="button-secondary">Documents</button>
            </Link>
          </div>
        </section>
      ) : null}

      <section className="dashboard-grid" aria-label="Key metrics">
        {loading ? (
          <>
            <MetricSkeleton />
            <MetricSkeleton />
            <MetricSkeleton />
            <MetricSkeleton />
          </>
        ) : (
          <>
            <Link href="/app/contracts" className="metric-card metric-card-link">
              <p className="metric-label">Contracts</p>
              <strong className="metric-value">{contracts.length}</strong>
              <span className="metric-subvalue">{draftCount} draft · {activeCount} active</span>
            </Link>
            <Link href="/app/contracts" className="metric-card metric-card-link">
              <p className="metric-label">Needs Setup</p>
              <strong className="metric-value">{incompleteContracts.length}</strong>
              <span className="metric-subvalue">contracts missing source inputs</span>
            </Link>
            <Link href="/app/documents" className="metric-card metric-card-link">
              <p className="metric-label">Pending Review</p>
              <strong className="metric-value">{reviewTasks.length}</strong>
              <span className="metric-subvalue">document approvals waiting</span>
            </Link>
            <Link href="/app/masters/customers" className="metric-card metric-card-link">
              <p className="metric-label">Buyers</p>
              <strong className="metric-value">{customers.length}</strong>
              <span className="metric-subvalue">master records</span>
            </Link>
          </>
        )}
      </section>

      <div className="dashboard-columns">
        <section className="card dashboard-panel">
          <div className="section-heading">
            <div>
              <h3>Needs Attention</h3>
              <p className="sidebar-subtitle">
                {loading
                  ? "Loading operational tasks..."
                  : attentionCount > 0
                    ? `${attentionCount} item${attentionCount === 1 ? "" : "s"} waiting on your team`
                    : "No blockers right now. You're caught up."}
              </p>
            </div>
          </div>

          {loading ? (
            <CenteredLoader label="Loading tasks..." scope="inline" />
          ) : attentionCount === 0 ? (
            <p className="dashboard-empty-copy">Create a contract or open Documents to start the export workflow.</p>
          ) : (
            <ul className="dashboard-task-list">
              {reviewTasks.slice(0, 5).map((notification) => (
                <li key={notification.id} className="dashboard-task-item">
                  <div className="dashboard-task-copy">
                    <strong>{notification.title}</strong>
                    <p>{notification.message}</p>
                  </div>
                  <Link href={notification.targetPath} className="button-link button-link-secondary">
                    Review
                  </Link>
                </li>
              ))}
              {incompleteContracts.map(({ contract, missing }) => (
                <li key={contract.id} className="dashboard-task-item">
                  <div className="dashboard-task-copy">
                    <strong>{contract.contractNumber}</strong>
                    <p>Missing source documents: {missing.join(", ")}</p>
                  </div>
                  <Link
                    href={`/app/contracts/${encodeURIComponent(contract.contractNumber)}/inputs/contract`}
                    className="button-link button-link-secondary"
                  >
                    Complete
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card dashboard-panel">
          <div className="section-heading">
            <div>
              <h3>Recent Contracts</h3>
              <p className="sidebar-subtitle">Latest updated export workspaces.</p>
            </div>
            <Link href="/app/contracts">View all</Link>
          </div>

          {loading ? (
            <CenteredLoader label="Loading contracts..." scope="inline" />
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Contract</th>
                    <th>Buyer</th>
                    <th>Status</th>
                    <th>Updated</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recentContracts.length === 0 ? (
                    <tr>
                      <td colSpan={5}>No contracts yet. Start with a new export contract.</td>
                    </tr>
                  ) : (
                    recentContracts.map((contract) => (
                      <tr key={contract.id}>
                        <td>{contract.contractNumber}</td>
                        <td>{customerNameById.get(contract.customerId) ?? contract.customerId}</td>
                        <td>
                          <span className={`status-pill status-${contract.status.toLowerCase().replace(/\s+/g, "-")}`}>
                            {contract.status}
                          </span>
                        </td>
                        <td>{formatTimestamp(contract.updatedAt)}</td>
                        <td>
                          <div className="dashboard-table-actions">
                            <Link
                              href={`/app/contracts/${encodeURIComponent(contract.contractNumber)}`}
                              className="button-link button-link-secondary"
                            >
                              Open
                            </Link>
                            <Link
                              href={`/app/contracts/${encodeURIComponent(contract.contractNumber)}/inputs/contract`}
                              className="button-link button-link-secondary"
                            >
                              Source
                            </Link>
                            <Link
                              href={`/app/contracts/${encodeURIComponent(contract.contractNumber)}/documents`}
                              className="button-link button-link-secondary"
                            >
                              Docs
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {!loading && contracts.length === 0 ? (
        <section className="card dashboard-panel dashboard-guide-card">
          <div className="section-heading">
            <div>
              <h3>Getting Started</h3>
              <p className="sidebar-subtitle">Follow this flow for a clean and consistent export process.</p>
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
      ) : null}
    </section>
  );
}

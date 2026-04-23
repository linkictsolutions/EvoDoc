"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { apiClient } from "@/lib/api/client";
import { DEFAULT_ORG_ID } from "@/lib/config";
import type { Contract } from "@/types/models";

export default function ContractsPage() {
  const [items, setItems] = useState<Contract[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Contract | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  async function handleDelete() {
    if (!deleteTarget) {
      return;
    }

    setDeleting(true);
    setError(null);
    setNotice(null);

    try {
      const deleted = await apiClient<{
        deleted: boolean;
        deletedContractDocuments: number;
        deletedAuditLogs: number;
        deletedNotifications: number;
      }>(
        `/api/contracts?orgId=${DEFAULT_ORG_ID}&contractId=${encodeURIComponent(deleteTarget.contractNumber)}`,
        { method: "DELETE" },
      );

      setItems((current) => current.filter((contract) => contract.id !== deleteTarget.id));
      setNotice(
        `Contract ${deleteTarget.contractNumber} deleted. Removed ${deleted.deletedContractDocuments} records, `
        + `${deleted.deletedAuditLogs} audit logs, ${deleted.deletedNotifications} notifications.`,
      );
      setDeleteTarget(null);
    } catch (deleteError) {
      setError((deleteError as Error).message);
    } finally {
      setDeleting(false);
    }
  }

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
        {notice ? <p>{notice}</p> : null}
        {error ? <p className="error-text">{error}</p> : null}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Contract #</th>
                <th>Status</th>
                <th>Buyer ID</th>
                <th>Updated</th>
                <th>Actions</th>
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
                      <div className="row-actions">
                        <Link
                          href={`/app/contracts/${encodeURIComponent(contract.contractNumber)}`}
                          className="button-link button-link-secondary"
                        >
                          Open
                        </Link>
                        <button
                          type="button"
                          className="button-secondary"
                          onClick={() => setDeleteTarget(contract)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Contract"
        message={deleteTarget
          ? `Delete contract ${deleteTarget.contractNumber} and all linked records (inputs, execution, shipments, documents)?`
          : ""}
        confirmLabel="Delete Contract"
        cancelLabel="Cancel"
        destructive
        busy={deleting}
        onCancel={() => {
          if (!deleting) {
            setDeleteTarget(null);
          }
        }}
        onConfirm={() => void handleDelete()}
      />
    </section>
  );
}

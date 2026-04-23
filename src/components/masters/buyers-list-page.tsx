"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api/client";
import { DEFAULT_ORG_ID } from "@/lib/config";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { Customer } from "@/types/models";

export function BuyersListPage() {
  const [buyers, setBuyers] = useState<Customer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [deletingBuyerId, setDeletingBuyerId] = useState<string | null>(null);
  const [buyerPendingDelete, setBuyerPendingDelete] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadBuyers() {
    setLoading(true);
    setError(null);

    try {
      const data = await apiClient<Customer[]>(`/api/customers?orgId=${DEFAULT_ORG_ID}`);
      setBuyers(data);
    } catch (loadError) {
      setError((loadError as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadBuyers();
  }, []);

  async function handleDelete() {
    if (!buyerPendingDelete) {
      return;
    }

    setDeletingBuyerId(buyerPendingDelete.id);
    setError(null);
    setNotice(null);

    try {
      await apiClient<{ deleted: boolean }>(
        `/api/customers?orgId=${DEFAULT_ORG_ID}&customerId=${buyerPendingDelete.id}`,
        { method: "DELETE" },
      );

      setNotice("Buyer deleted.");
      setBuyerPendingDelete(null);
      await loadBuyers();
    } catch (deleteError) {
      setError((deleteError as Error).message);
    } finally {
      setDeletingBuyerId(null);
    }
  }

  return (
    <section className="page-shell">
      <header className="page-header">
        <h1>Buyers</h1>
        <p>Browse existing buyers first, then create or edit records in dedicated pages.</p>
        <div className="row-actions page-header-actions">
          <Link href="/app/masters/customers/new">
            <button type="button">Add New Buyer</button>
          </Link>
        </div>
      </header>

      <section className="card">
        <div className="section-heading">
          <div>
            <h3>Buyer Registry</h3>
            <p className="sidebar-subtitle">Current buyers saved to Firestore.</p>
          </div>
          <button type="button" className="button-secondary" onClick={() => void loadBuyers()} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {error ? <p className="error-text">{error}</p> : null}
        {notice ? <p>{notice}</p> : null}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Country</th>
                <th>Contact</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {buyers.length === 0 ? (
                <tr>
                  <td colSpan={5}>{loading ? "Loading buyers..." : "No buyers saved yet."}</td>
                </tr>
              ) : (
                buyers.map((buyer) => (
                  <tr key={buyer.id}>
                    <td>
                      <strong>{buyer.name}</strong>
                      <div className="table-meta">{buyer.id}</div>
                    </td>
                    <td>{buyer.country}</td>
                    <td>{buyer.contactName || buyer.contactEmail || "-"}</td>
                    <td>{new Date(buyer.updatedAt).toLocaleString()}</td>
                    <td>
                      <div className="row-actions">
                        <Link href={`/app/masters/customers/${buyer.id}/edit`}>
                          <button type="button" className="button-secondary" disabled={Boolean(deletingBuyerId)}>
                            Edit
                          </button>
                        </Link>
                        <button
                          type="button"
                          className="button-secondary"
                          onClick={() => setBuyerPendingDelete(buyer)}
                          disabled={Boolean(deletingBuyerId)}
                        >
                          {deletingBuyerId === buyer.id ? "Deleting..." : "Delete"}
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
        open={Boolean(buyerPendingDelete)}
        title="Delete Buyer?"
        message={buyerPendingDelete ? `Delete buyer \"${buyerPendingDelete.name}\"? This action cannot be undone.` : ""}
        confirmLabel="Delete Buyer"
        cancelLabel="Cancel"
        destructive
        busy={Boolean(deletingBuyerId)}
        onConfirm={() => void handleDelete()}
        onCancel={() => {
          if (!deletingBuyerId) {
            setBuyerPendingDelete(null);
          }
        }}
      />
    </section>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api/client";
import { DEFAULT_ORG_ID } from "@/lib/config";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { Item } from "@/types/models";

export function ItemsListPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [itemPendingDelete, setItemPendingDelete] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadItems() {
    setLoading(true);
    setError(null);

    try {
      const data = await apiClient<Item[]>(`/api/items?orgId=${DEFAULT_ORG_ID}`);
      setItems(data);
    } catch (loadError) {
      setError((loadError as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadItems();
  }, []);

  async function handleDelete() {
    if (!itemPendingDelete) {
      return;
    }

    setDeletingItemId(itemPendingDelete.id);
    setError(null);
    setNotice(null);

    try {
      await apiClient<{ deleted: boolean }>(
        `/api/items?orgId=${DEFAULT_ORG_ID}&itemId=${itemPendingDelete.id}`,
        { method: "DELETE" },
      );

      setNotice("Item deleted.");
      setItemPendingDelete(null);
      await loadItems();
    } catch (deleteError) {
      setError((deleteError as Error).message);
    } finally {
      setDeletingItemId(null);
    }
  }

  return (
    <section className="page-shell">
      <header className="page-header">
        <h1>Items</h1>
        <p>Browse item registry entries, then create or edit records in dedicated pages.</p>
        <div className="row-actions page-header-actions">
          <Link href="/app/masters/items/new">
            <button type="button">Add New Item</button>
          </Link>
        </div>
      </header>

      <section className="card">
        <div className="section-heading">
          <div>
            <h3>Item Registry</h3>
            <p className="sidebar-subtitle">Reusable item master for contract defaults.</p>
          </div>
          <button type="button" className="button-secondary" onClick={() => void loadItems()} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {error ? <p className="error-text">{error}</p> : null}
        {notice ? <p>{notice}</p> : null}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>HS Code</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5}>{loading ? "Loading items..." : "No items saved yet."}</td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.itemCode}</strong>
                      <div className="table-meta">{item.defaultPackagingUnit || "-"}</div>
                    </td>
                    <td>{item.name}</td>
                    <td>{item.hsCode || "-"}</td>
                    <td>
                      <span className={`status-pill ${item.active ? "status-approved" : "status-returned_to_draft"}`}>
                        {item.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <Link href={`/app/masters/items/${item.id}/edit`}>
                          <button type="button" className="button-secondary" disabled={Boolean(deletingItemId)}>
                            Edit
                          </button>
                        </Link>
                        <button
                          type="button"
                          className="button-secondary"
                          onClick={() => setItemPendingDelete(item)}
                          disabled={Boolean(deletingItemId)}
                        >
                          {deletingItemId === item.id ? "Deleting..." : "Delete"}
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
        open={Boolean(itemPendingDelete)}
        title="Delete Item?"
        message={itemPendingDelete ? `Delete item "${itemPendingDelete.name}"? This action cannot be undone.` : ""}
        confirmLabel="Delete Item"
        cancelLabel="Cancel"
        destructive
        busy={Boolean(deletingItemId)}
        onConfirm={() => void handleDelete()}
        onCancel={() => {
          if (!deletingItemId) {
            setItemPendingDelete(null);
          }
        }}
      />
    </section>
  );
}

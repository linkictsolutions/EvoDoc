"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api/client";
import { DEFAULT_ORG_ID } from "@/lib/config";
import type { CompanyConfiguration, Item } from "@/types/models";

type ItemFormState = {
  itemCode: string;
  name: string;
  description: string;
  hsCode: string;
  origin: string;
  grade: string;
  defaultPackagingUnit: string;
  defaultBagWeightKg: string;
  active: boolean;
};

const initialForm: ItemFormState = {
  itemCode: "",
  name: "",
  description: "",
  hsCode: "",
  origin: "",
  grade: "",
  defaultPackagingUnit: "Bag of 60Kg",
  defaultBagWeightKg: "60",
  active: true,
};

export function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [form, setForm] = useState<ItemFormState>(initialForm);
  const [companyConfiguration, setCompanyConfiguration] = useState<CompanyConfiguration | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
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
    void apiClient<CompanyConfiguration>(`/api/company-configuration?orgId=${DEFAULT_ORG_ID}`)
      .then((data) => {
        setCompanyConfiguration(data);
        setForm((current) => ({
          ...current,
          hsCode: current.hsCode || data.defaultHsCode,
          origin: current.origin || data.defaultOrigin,
        }));
      })
      .catch(() => {
        setCompanyConfiguration(null);
      });
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await apiClient<{ itemId: string }>("/api/items", {
        method: "POST",
        body: JSON.stringify({
          orgId: DEFAULT_ORG_ID,
          item: {
            itemCode: form.itemCode,
            name: form.name,
            description: form.description,
            hsCode: form.hsCode,
            origin: form.origin,
            grade: form.grade,
            defaultPackagingUnit: form.defaultPackagingUnit,
            defaultBagWeightKg: form.defaultBagWeightKg === "" ? undefined : Number(form.defaultBagWeightKg),
            active: form.active,
          },
        }),
      });

      setForm({
        ...initialForm,
        hsCode: companyConfiguration?.defaultHsCode ?? "",
        origin: companyConfiguration?.defaultOrigin ?? "",
      });
      await loadItems();
    } catch (submitError) {
      setError((submitError as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function updateField<Key extends keyof ItemFormState>(key: Key, value: ItemFormState[Key]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  return (
    <section className="page-shell">
      <header className="page-header">
        <h1>Items</h1>
        <p>Maintain reusable coffee item definitions, defaults, and customs codes outside the contract form.</p>
      </header>

      <div className="master-grid">
        <form className="card form-grid" onSubmit={handleSubmit}>
          <h3>Add Item</h3>
          <label>
            Item Code
            <input value={form.itemCode} onChange={(event) => updateField("itemCode", event.target.value)} required />
          </label>
          <label>
            Item Name
            <input value={form.name} onChange={(event) => updateField("name", event.target.value)} required />
          </label>
          <label style={{ gridColumn: "1 / -1" }}>
            Description
            <textarea rows={4} value={form.description} onChange={(event) => updateField("description", event.target.value)} />
          </label>
          <label>
            HS Code
            <input value={form.hsCode} onChange={(event) => updateField("hsCode", event.target.value)} />
          </label>
          <label>
            Origin
            <input value={form.origin} onChange={(event) => updateField("origin", event.target.value)} />
          </label>
          <label>
            Grade
            <input value={form.grade} onChange={(event) => updateField("grade", event.target.value)} />
          </label>
          <label>
            Default Packaging
            <input value={form.defaultPackagingUnit} onChange={(event) => updateField("defaultPackagingUnit", event.target.value)} />
          </label>
          <label>
            Default Bag Weight (kg)
            <input
              type="number"
              step="0.001"
              value={form.defaultBagWeightKg}
              onChange={(event) => updateField("defaultBagWeightKg", event.target.value)}
            />
          </label>
          <label style={{ gridColumn: "1 / -1" }}>
            <span>Active</span>
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) => updateField("active", event.target.checked)}
            />
          </label>
          {error ? <p className="error-text">{error}</p> : null}
          <div className="row-actions">
            <button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Item"}</button>
          </div>
        </form>

        <section className="card">
          <div className="section-heading">
            <div>
              <h3>Item Registry</h3>
              <p className="sidebar-subtitle">Reusable item master for contract defaults.</p>
            </div>
            <button type="button" onClick={() => void loadItems()} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>HS Code</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={4}>{loading ? "Loading items..." : "No items saved yet."}</td>
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
                    <td>{item.active ? "Active" : "Inactive"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      </div>
    </section>
  );
}

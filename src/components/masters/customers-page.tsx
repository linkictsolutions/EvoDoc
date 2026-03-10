"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api/client";
import { DEFAULT_ORG_ID } from "@/lib/config";
import type { Customer } from "@/types/models";

type CustomerFormState = {
  name: string;
  shortName: string;
  address: string;
  country: string;
  contactName: string;
  contactEmail: string;
  taxId: string;
};

const initialForm: CustomerFormState = {
  name: "",
  shortName: "",
  address: "",
  country: "Ethiopia",
  contactName: "",
  contactEmail: "",
  taxId: "",
};

export function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [form, setForm] = useState<CustomerFormState>(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  async function loadCustomers() {
    setLoading(true);
    setError(null);

    try {
      const data = await apiClient<Customer[]>(`/api/customers?orgId=${DEFAULT_ORG_ID}`);
      setCustomers(data);
    } catch (loadError) {
      setError((loadError as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCustomers();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await apiClient<{ customerId: string }>("/api/customers", {
        method: "POST",
        body: JSON.stringify({
          orgId: DEFAULT_ORG_ID,
          customer: form,
        }),
      });

      setForm(initialForm);
      await loadCustomers();
    } catch (submitError) {
      setError((submitError as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function updateField<Key extends keyof CustomerFormState>(key: Key, value: CustomerFormState[Key]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  return (
    <section className="page-shell">
      <header className="page-header">
        <h1>Customers</h1>
        <p>Store buyer records once, then reuse them across contracts and document workflows.</p>
      </header>

      <div className="master-grid">
        <form className="card form-grid" onSubmit={handleSubmit}>
          <h3>Add Customer</h3>
          <label>
            Legal Name
            <input value={form.name} onChange={(event) => updateField("name", event.target.value)} required />
          </label>
          <label>
            Short Name
            <input value={form.shortName} onChange={(event) => updateField("shortName", event.target.value)} />
          </label>
          <label style={{ gridColumn: "1 / -1" }}>
            Address
            <textarea rows={4} value={form.address} onChange={(event) => updateField("address", event.target.value)} required />
          </label>
          <label>
            Country
            <input value={form.country} onChange={(event) => updateField("country", event.target.value)} required />
          </label>
          <label>
            Contact Name
            <input value={form.contactName} onChange={(event) => updateField("contactName", event.target.value)} />
          </label>
          <label>
            Contact Email
            <input type="email" value={form.contactEmail} onChange={(event) => updateField("contactEmail", event.target.value)} />
          </label>
          <label>
            Tax ID
            <input value={form.taxId} onChange={(event) => updateField("taxId", event.target.value)} />
          </label>
          {error ? <p className="error-text">{error}</p> : null}
          <div className="row-actions">
            <button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Customer"}</button>
          </div>
        </form>

        <section className="card">
          <div className="section-heading">
            <div>
              <h3>Customer Registry</h3>
              <p className="sidebar-subtitle">Current buyers saved to Firestore.</p>
            </div>
            <button type="button" onClick={() => void loadCustomers()} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Country</th>
                <th>Contact</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={4}>{loading ? "Loading customers..." : "No customers saved yet."}</td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr key={customer.id}>
                    <td>
                      <strong>{customer.name}</strong>
                      <div className="table-meta">{customer.shortName || customer.id}</div>
                    </td>
                    <td>{customer.country}</td>
                    <td>{customer.contactName || customer.contactEmail || "-"}</td>
                    <td>{new Date(customer.updatedAt).toLocaleString()}</td>
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

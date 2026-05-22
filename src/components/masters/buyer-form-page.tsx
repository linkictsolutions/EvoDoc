"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api/client";
import { DEFAULT_ORG_ID } from "@/lib/config";
import type { Customer } from "@/types/models";
import { CenteredLoader } from "@/components/ui/centered-loader";
import { useToast } from "@/components/ui/toast";

type BuyerFormState = {
  name: string;
  address: string;
  country: string;
  contactName: string;
  contactEmail: string;
  taxId: string;
};

const initialForm: BuyerFormState = {
  name: "",
  address: "",
  country: "Ethiopia",
  contactName: "",
  contactEmail: "",
  taxId: "",
};

export function BuyerFormPage({ buyerId }: { buyerId?: string }) {
  const toast = useToast();
  const router = useRouter();
  const [form, setForm] = useState<BuyerFormState>(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(Boolean(buyerId));

  const isEdit = Boolean(buyerId);

  useEffect(() => {
    if (!buyerId) {
      return;
    }

    let mounted = true;
    setLoading(true);
    setError(null);

    apiClient<Customer>(`/api/customers?orgId=${DEFAULT_ORG_ID}&customerId=${buyerId}`)
      .then((buyer) => {
        if (!mounted) {
          return;
        }

        setForm({
          name: buyer.name,
          address: buyer.address,
          country: buyer.country,
          contactName: buyer.contactName ?? "",
          contactEmail: buyer.contactEmail ?? "",
          taxId: buyer.taxId ?? "",
        });
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
  }, [buyerId]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await apiClient<{ customerId: string }>("/api/customers", {
        method: "POST",
        body: JSON.stringify({
          orgId: DEFAULT_ORG_ID,
          customerId: buyerId,
          customer: form,
        }),
      });

      toast.success("Buyer saved.");
      router.push("/app/masters/customers");
      router.refresh();
    } catch (submitError) {
      setError((submitError as Error).message);
      toast.error("Unable to save buyer.");
    } finally {
      setSaving(false);
    }
  }

  function updateField<Key extends keyof BuyerFormState>(key: Key, value: BuyerFormState[Key]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  if (loading) {
    return (
      <section className="page-shell">
        <section className="card">
          <CenteredLoader label="Loading buyer details..." />
        </section>
      </section>
    );
  }

  return (
    <section className="page-shell">
      <header className="page-header">
        <h1>{isEdit ? "Edit Buyer" : "Add New Buyer"}</h1>
        <p>{isEdit ? "Update buyer details and save changes." : "Create a buyer record for contract reuse."}</p>
      </header>

      <form className="card form-grid" onSubmit={handleSubmit}>
        <label>
          Legal Name
          <input value={form.name} onChange={(event) => updateField("name", event.target.value)} required />
        </label>
        <label className="span-all">
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
          <button type="submit" disabled={saving}>{saving ? "Saving..." : isEdit ? "Save Changes" : "Save Buyer"}</button>
          <Link href="/app/masters/customers">
            <button type="button" className="button-secondary" disabled={saving}>Back to Buyers</button>
          </Link>
        </div>
      </form>
    </section>
  );
}

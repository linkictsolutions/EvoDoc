"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api/client";
import { DEFAULT_ORG_ID } from "@/lib/config";
import type { Customer } from "@/types/models";
import { CenteredLoader } from "@/components/ui/centered-loader";
import { FormActionBar } from "@/components/ui/form-action-bar";
import { FormSection } from "@/components/ui/form-section";
import { useToast } from "@/components/ui/toast";
import { useUnsavedChangesGuard } from "@/components/ui/use-unsaved-changes-guard";

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
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [highlightDirty, setHighlightDirty] = useState(false);
  const initialSnapshot = useRef<BuyerFormState>(initialForm);
  const initialSnapshotJson = useRef(JSON.stringify(initialForm));

  const isEdit = Boolean(buyerId);
  const isDirty = useMemo(() => JSON.stringify(form) !== initialSnapshotJson.current, [form]);

  useUnsavedChangesGuard({ enabled: isDirty && !saving, onBlockedNavigation: () => setHighlightDirty(true) });

  const isFieldDirty = useCallback(
    (name: keyof BuyerFormState) => form[name] !== initialSnapshot.current[name],
    [form],
  );
  const dirtyControlClass = useCallback(
    (name: keyof BuyerFormState) => (highlightDirty && isFieldDirty(name) ? "field-error-control" : undefined),
    [highlightDirty, isFieldDirty],
  );

  function requiredLabelClass(isMissing: boolean) {
    return isMissing ? "is-required field-error" : "is-required";
  }

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

        const nextForm: BuyerFormState = {
          name: buyer.name,
          address: buyer.address,
          country: buyer.country,
          contactName: buyer.contactName ?? "",
          contactEmail: buyer.contactEmail ?? "",
          taxId: buyer.taxId ?? "",
        };
        setForm(nextForm);
        initialSnapshot.current = nextForm;
        initialSnapshotJson.current = JSON.stringify(nextForm);
        setHighlightDirty(false);
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

  function discardChanges() {
    setForm(initialSnapshot.current);
    setAttemptedSubmit(false);
    setHighlightDirty(false);
    toast.info("Discarded unsaved changes.");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAttemptedSubmit(true);

    const missingName = form.name.trim().length === 0;
    const missingAddress = form.address.trim().length === 0;
    const missingCountry = form.country.trim().length === 0;
    if (missingName || missingAddress || missingCountry) {
      toast.error("Fill in the required fields.");
      return;
    }

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
      initialSnapshot.current = form;
      initialSnapshotJson.current = JSON.stringify(form);
      setHighlightDirty(false);
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

      <form className="form-workspace" onSubmit={handleSubmit} noValidate>
        <FormSection title="Legal Identity" description="Official buyer name and registered address used on contracts.">
          <label className={`span-all ${requiredLabelClass(attemptedSubmit && form.name.trim().length === 0)}`}>
            <span className="label-text">Legal Name</span>
            <input
              className={dirtyControlClass("name")}
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              required
            />
          </label>
          <label className={`span-all ${requiredLabelClass(attemptedSubmit && form.address.trim().length === 0)}`}>
            <span className="label-text">Address</span>
            <textarea
              className={dirtyControlClass("address")}
              rows={4}
              value={form.address}
              onChange={(event) => updateField("address", event.target.value)}
              required
            />
          </label>
        </FormSection>

        <FormSection title="Location & Tax" description="Country and optional tax identification.">
          <label className={`col-6 ${requiredLabelClass(attemptedSubmit && form.country.trim().length === 0)}`}>
            <span className="label-text">Country</span>
            <input
              className={dirtyControlClass("country")}
              value={form.country}
              onChange={(event) => updateField("country", event.target.value)}
              required
            />
          </label>
          <label className="col-6">
            Tax ID
            <input
              className={dirtyControlClass("taxId")}
              value={form.taxId}
              onChange={(event) => updateField("taxId", event.target.value)}
            />
          </label>
        </FormSection>

        <FormSection title="Contact" description="Optional contact person for this buyer.">
          <label className="col-6">
            Contact Name
            <input
              className={dirtyControlClass("contactName")}
              value={form.contactName}
              onChange={(event) => updateField("contactName", event.target.value)}
            />
          </label>
          <label className="col-6">
            Contact Email
            <input
              className={dirtyControlClass("contactEmail")}
              type="email"
              value={form.contactEmail}
              onChange={(event) => updateField("contactEmail", event.target.value)}
            />
          </label>
        </FormSection>

        {error ? <p className="error-text">{error}</p> : null}

        <FormActionBar hint={isDirty ? "You have unsaved changes." : undefined}>
          <button type="submit" disabled={saving}>{saving ? "Saving..." : isEdit ? "Save Changes" : "Save Buyer"}</button>
          <button type="button" className="button-secondary" disabled={!isDirty || saving} onClick={discardChanges}>
            Discard changes
          </button>
          <Link href="/app/masters/customers">
            <button type="button" className="button-secondary" disabled={saving}>Back to Buyers</button>
          </Link>
        </FormActionBar>
      </form>
    </section>
  );
}

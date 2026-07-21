"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api/client";
import { DEFAULT_ORG_ID } from "@/lib/config";
import type { CompanyConfiguration, Item } from "@/types/models";
import { CenteredLoader } from "@/components/ui/centered-loader";
import { useToast } from "@/components/ui/toast";
import { useUnsavedChangesGuard } from "@/components/ui/use-unsaved-changes-guard";

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

export function ItemFormPage({ itemId }: { itemId?: string }) {
  const toast = useToast();
  const router = useRouter();
  const [form, setForm] = useState<ItemFormState>(initialForm);
  const [companyConfiguration, setCompanyConfiguration] = useState<CompanyConfiguration | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [highlightDirty, setHighlightDirty] = useState(false);
  const initialSnapshot = useRef<ItemFormState>(initialForm);
  const initialSnapshotJson = useRef(JSON.stringify(initialForm));

  const isEdit = Boolean(itemId);
  const isDirty = useMemo(() => JSON.stringify(form) !== initialSnapshotJson.current, [form]);

  useUnsavedChangesGuard({ enabled: isDirty && !saving, onBlockedNavigation: () => setHighlightDirty(true) });

  const isFieldDirty = useCallback(
    (name: keyof ItemFormState) => form[name] !== initialSnapshot.current[name],
    [form],
  );
  const dirtyControlClass = useCallback(
    (name: keyof ItemFormState) => (highlightDirty && isFieldDirty(name) ? "field-error-control" : undefined),
    [highlightDirty, isFieldDirty],
  );

  function requiredLabelClass(isMissing: boolean) {
    return isMissing ? "is-required field-error" : "is-required";
  }

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    Promise.all([
      apiClient<CompanyConfiguration>(`/api/company-configuration?orgId=${DEFAULT_ORG_ID}`).catch(() => null),
      itemId ? apiClient<Item>(`/api/items?orgId=${DEFAULT_ORG_ID}&itemId=${itemId}`) : Promise.resolve(null),
    ])
      .then(([config, item]) => {
        if (!mounted) {
          return;
        }

        setCompanyConfiguration(config);

        if (item) {
          const nextForm: ItemFormState = {
            itemCode: item.itemCode,
            name: item.name,
            description: item.description ?? "",
            hsCode: item.hsCode ?? "",
            origin: item.origin ?? "",
            grade: item.grade ?? "",
            defaultPackagingUnit: item.defaultPackagingUnit ?? "Bag of 60Kg",
            defaultBagWeightKg: item.defaultBagWeightKg == null ? "" : String(item.defaultBagWeightKg),
            active: item.active,
          };
          setForm(nextForm);
          initialSnapshot.current = nextForm;
          initialSnapshotJson.current = JSON.stringify(nextForm);
          setHighlightDirty(false);
        } else {
          const nextForm: ItemFormState = {
            ...initialForm,
            hsCode: config?.defaultHsCode ?? "",
            origin: config?.defaultOrigin ?? "",
          };
          setForm(nextForm);
          initialSnapshot.current = nextForm;
          initialSnapshotJson.current = JSON.stringify(nextForm);
          setHighlightDirty(false);
        }
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
  }, [itemId]);

  function discardChanges() {
    setForm(initialSnapshot.current);
    setAttemptedSubmit(false);
    setHighlightDirty(false);
    toast.info("Discarded unsaved changes.");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAttemptedSubmit(true);

    const missingCode = form.itemCode.trim().length === 0;
    const missingName = form.name.trim().length === 0;
    if (missingCode || missingName) {
      toast.error("Fill in the required fields.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await apiClient<{ itemId: string }>("/api/items", {
        method: "POST",
        body: JSON.stringify({
          orgId: DEFAULT_ORG_ID,
          itemId,
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

      toast.success("Item saved.");
      initialSnapshot.current = form;
      initialSnapshotJson.current = JSON.stringify(form);
      setHighlightDirty(false);
      router.push("/app/masters/items");
      router.refresh();
    } catch (submitError) {
      setError((submitError as Error).message);
      toast.error("Unable to save item.");
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

  if (loading) {
    return (
      <section className="page-shell">
        <section className="card">
          <CenteredLoader label="Loading item details..." />
        </section>
      </section>
    );
  }

  return (
    <section className="page-shell">
      <header className="page-header">
        <h1>{isEdit ? "Edit Item" : "Add New Item"}</h1>
        <p>{isEdit ? "Update item definition and save changes." : "Create a reusable item record for contracts."}</p>
      </header>

      <form className="card form-grid" onSubmit={handleSubmit} noValidate>
        <label className={requiredLabelClass(attemptedSubmit && form.itemCode.trim().length === 0)}>
          <span className="label-text">Item Code</span>
          <input
            className={dirtyControlClass("itemCode")}
            value={form.itemCode}
            onChange={(event) => updateField("itemCode", event.target.value)}
            required
          />
        </label>
        <label className={requiredLabelClass(attemptedSubmit && form.name.trim().length === 0)}>
          <span className="label-text">Item Name</span>
          <input
            className={dirtyControlClass("name")}
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
            required
          />
        </label>
        <label className="span-all">
          Description
          <textarea
            className={dirtyControlClass("description")}
            rows={4}
            value={form.description}
            onChange={(event) => updateField("description", event.target.value)}
          />
        </label>
        <label>
          HS Code
          <input
            className={dirtyControlClass("hsCode")}
            value={form.hsCode}
            onChange={(event) => updateField("hsCode", event.target.value)}
          />
        </label>
        <label>
          Origin
          <input
            className={dirtyControlClass("origin")}
            value={form.origin}
            onChange={(event) => updateField("origin", event.target.value)}
          />
        </label>
        <label>
          Grade
          <input
            className={dirtyControlClass("grade")}
            value={form.grade}
            onChange={(event) => updateField("grade", event.target.value)}
          />
        </label>
        <label>
          Default Packaging
          <input
            className={dirtyControlClass("defaultPackagingUnit")}
            value={form.defaultPackagingUnit}
            onChange={(event) => updateField("defaultPackagingUnit", event.target.value)}
          />
        </label>
        <label>
          Default Bag Weight (kg)
          <input
            className={dirtyControlClass("defaultBagWeightKg")}
            type="number"
            step="0.001"
            value={form.defaultBagWeightKg}
            onChange={(event) => updateField("defaultBagWeightKg", event.target.value)}
          />
        </label>
        <label>
          <span>Active</span>
          <input
            type="checkbox"
            checked={form.active}
            onChange={(event) => updateField("active", event.target.checked)}
          />
        </label>

        {companyConfiguration ? (
          <p className="sidebar-subtitle span-all">
            Company defaults: Origin {companyConfiguration.defaultOrigin}, HS Code {companyConfiguration.defaultHsCode}
          </p>
        ) : null}

        {error ? <p className="error-text">{error}</p> : null}
        <div className="row-actions">
          <button type="submit" disabled={saving}>{saving ? "Saving..." : isEdit ? "Save Changes" : "Save Item"}</button>
          <button type="button" className="button-secondary" disabled={!isDirty || saving} onClick={discardChanges}>
            Discard changes
          </button>
          <Link href="/app/masters/items">
            <button type="button" className="button-secondary" disabled={saving}>Back to Items</button>
          </Link>
        </div>
      </form>
    </section>
  );
}

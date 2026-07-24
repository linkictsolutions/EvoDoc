"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiClient } from "@/lib/api/client";
import { DEFAULT_ORG_ID } from "@/lib/config";
import type { CompanyConfiguration, ProcessingSheet } from "@/types/models";
import { CenteredLoader } from "@/components/ui/centered-loader";
import { FormActionBar } from "@/components/ui/form-action-bar";
import { FormSection } from "@/components/ui/form-section";
import { useToast } from "@/components/ui/toast";
import { useUnsavedChangesGuard } from "@/components/ui/use-unsaved-changes-guard";

export function ProcessingPage({ contractId }: { contractId: string }) {
  const toast = useToast();
  const [form, setForm] = useState<ProcessingSheet | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingEnabled, setProcessingEnabled] = useState(true);
  const [highlightDirty, setHighlightDirty] = useState(false);
  const lastSavedRef = useRef<ProcessingSheet | null>(null);

  const isDirty = useMemo(() => {
    if (!form || !lastSavedRef.current) {
      return false;
    }
    return JSON.stringify(form) !== JSON.stringify(lastSavedRef.current);
  }, [form]);

  useUnsavedChangesGuard({ enabled: isDirty && !saving, onBlockedNavigation: () => setHighlightDirty(true) });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, companyConfiguration] = await Promise.all([
        apiClient<ProcessingSheet>(`/api/contracts/${contractId}/execution/processing?orgId=${DEFAULT_ORG_ID}`),
        apiClient<CompanyConfiguration>(`/api/company-configuration?orgId=${DEFAULT_ORG_ID}`).catch(() => null),
      ]);
      setProcessingEnabled(companyConfiguration?.processingEnabled ?? true);
      setForm(data);
      lastSavedRef.current = data;
      setHighlightDirty(false);
    } catch (loadError) {
      setError((loadError as Error).message);
    } finally {
      setLoading(false);
    }
  }, [contractId]);

  useEffect(() => {
    void load();
  }, [load]);

  function discardChanges() {
    if (!lastSavedRef.current) {
      return;
    }
    setForm(lastSavedRef.current);
    setHighlightDirty(false);
    toast.info("Discarded unsaved changes.");
  }

  async function save() {
    if (!form) {
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await apiClient(`/api/contracts/${contractId}/execution/processing`, {
        method: "POST",
        body: JSON.stringify({
          orgId: DEFAULT_ORG_ID,
          processing: {
            moisturePercent: form.moisturePercent,
            stationName: form.stationName,
            stationNameLocal: form.stationNameLocal,
            stationAddress: form.stationAddress,
          },
        }),
      });
      await load();
      toast.success("Processing saved.");
    } catch (saveError) {
      setError((saveError as Error).message);
      toast.error("Unable to save processing.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="card">
        <CenteredLoader label="Loading processing..." />
      </section>
    );
  }

  if (!form) {
    return (
      <section className="card">
        <p className="error-text">{error ?? "Unable to load processing."}</p>
      </section>
    );
  }

  if (!processingEnabled) {
    return (
      <section className="card">
        <h3>Processing Disabled</h3>
        <p className="sidebar-subtitle">Processing is turned off in company configuration. Enable it under Masters → Company Configuration → Execution & Shipping if this contract needs processing data.</p>
      </section>
    );
  }

  const moistureDirty = Boolean(lastSavedRef.current && form.moisturePercent !== lastSavedRef.current.moisturePercent);
  const stationDirty = Boolean(lastSavedRef.current && form.stationName !== lastSavedRef.current.stationName);
  const stationLocalDirty = Boolean(lastSavedRef.current && (form.stationNameLocal ?? "") !== (lastSavedRef.current.stationNameLocal ?? ""));
  const addressDirty = Boolean(lastSavedRef.current && form.stationAddress !== lastSavedRef.current.stationAddress);

  return (
    <section className="page-shell">
      <form className="form-workspace" onSubmit={(event) => { event.preventDefault(); void save(); }}>
        <FormSection title="Processing Details" description="Processing station and moisture details used by packing and certificates.">
        <label className="col-4">
          Moisture (%)
          <input
            className={highlightDirty && moistureDirty ? "field-error-control" : undefined}
            type="number"
            step="0.001"
            value={form.moisturePercent}
            onChange={(event) => setForm((current) => current ? { ...current, moisturePercent: Number(event.target.value) } : current)}
          />
        </label>
        <label className="col-4">
          Processing Station
          <input
            className={highlightDirty && stationDirty ? "field-error-control" : undefined}
            value={form.stationName}
            onChange={(event) => setForm((current) => current ? { ...current, stationName: event.target.value } : current)}
          />
        </label>
        <label className="col-4">
          Local Station Name
          <input
            className={highlightDirty && stationLocalDirty ? "field-error-control" : undefined}
            value={form.stationNameLocal ?? ""}
            onChange={(event) => setForm((current) => current ? { ...current, stationNameLocal: event.target.value } : current)}
          />
        </label>
        <label className="span-all">
          Station Address
          <textarea
            className={highlightDirty && addressDirty ? "field-error-control" : undefined}
            rows={3}
            value={form.stationAddress}
            onChange={(event) => setForm((current) => current ? { ...current, stationAddress: event.target.value } : current)}
          />
        </label>
        </FormSection>

        {error ? <p className="error-text">{error}</p> : null}

        <FormActionBar hint={isDirty ? "You have unsaved changes." : undefined}>
          <button type="button" className="button-secondary" onClick={() => void load()} disabled={saving}>Refresh</button>
          <button type="button" className="button-secondary" onClick={discardChanges} disabled={!isDirty || saving}>Discard changes</button>
          <button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Processing"}</button>
        </FormActionBar>
      </form>
    </section>
  );
}

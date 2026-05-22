"use client";

import { useCallback, useEffect, useState } from "react";
import { apiClient } from "@/lib/api/client";
import { DEFAULT_ORG_ID } from "@/lib/config";
import type { ProcessingSheet } from "@/types/models";
import { CenteredLoader } from "@/components/ui/centered-loader";
import { useToast } from "@/components/ui/toast";

export function ProcessingPage({ contractId }: { contractId: string }) {
  const toast = useToast();
  const [form, setForm] = useState<ProcessingSheet | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient<ProcessingSheet>(`/api/contracts/${contractId}/execution/processing?orgId=${DEFAULT_ORG_ID}`);
      setForm(data);
    } catch (loadError) {
      setError((loadError as Error).message);
    } finally {
      setLoading(false);
    }
  }, [contractId]);

  useEffect(() => {
    void load();
  }, [load]);

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

  return (
    <section className="page-shell">
      <header className="page-header">
        <h1>Processing</h1>
        <p>Processing station and moisture details used by packing, certificates, and execution documents.</p>
      </header>

      <section className="card form-grid">
        <label>
          Moisture
          <input
            type="number"
            step="0.001"
            value={form.moisturePercent}
            onChange={(event) => setForm((current) => current ? { ...current, moisturePercent: Number(event.target.value) } : current)}
          />
        </label>
        <label>
          Processing Station
          <input
            value={form.stationName}
            onChange={(event) => setForm((current) => current ? { ...current, stationName: event.target.value } : current)}
          />
        </label>
        <label>
          Local Station Name
          <input
            value={form.stationNameLocal ?? ""}
            onChange={(event) => setForm((current) => current ? { ...current, stationNameLocal: event.target.value } : current)}
          />
        </label>
        <label className="span-all">
          Station Address
          <textarea
            rows={3}
            value={form.stationAddress}
            onChange={(event) => setForm((current) => current ? { ...current, stationAddress: event.target.value } : current)}
          />
        </label>
        {error ? <p className="error-text">{error}</p> : null}
        <div className="row-actions">
          <button type="button" className="button-secondary" onClick={() => void load()} disabled={saving}>Refresh</button>
          <button type="button" onClick={() => void save()} disabled={saving}>{saving ? "Saving..." : "Save Processing"}</button>
        </div>
      </section>
    </section>
  );
}

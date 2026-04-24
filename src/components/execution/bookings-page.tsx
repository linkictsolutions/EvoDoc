"use client";

import { useCallback, useEffect, useState } from "react";
import { appendVehiclePair, removeLastVehiclePair, syncBookingEntryPairs } from "@/domain/execution";
import { apiClient } from "@/lib/api/client";
import { DEFAULT_ORG_ID } from "@/lib/config";
import type { BookingsSheet } from "@/types/models";
import { CenteredLoader } from "@/components/ui/centered-loader";

type ContractShippingOptionsResponse = {
  contract: {
    shipping: {
      shippingLine?: string;
      alternative1?: string;
      alternative2?: string;
    };
  };
};

function buildShippingLineOptions(
  contractData: ContractShippingOptionsResponse | null,
  currentShippingLine?: string,
): string[] {
  const options = [
    contractData?.contract.shipping.shippingLine,
    contractData?.contract.shipping.alternative1,
    contractData?.contract.shipping.alternative2,
    currentShippingLine,
  ]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));

  return Array.from(new Set(options));
}

export function BookingsPage({ contractId }: { contractId: string }) {
  const [form, setForm] = useState<BookingsSheet | null>(null);
  const [shippingLineOptions, setShippingLineOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [bookingsData, contractData] = await Promise.all([
        apiClient<BookingsSheet>(`/api/contracts/${contractId}/execution/bookings?orgId=${DEFAULT_ORG_ID}`),
        apiClient<ContractShippingOptionsResponse>(`/api/contracts/${contractId}?orgId=${DEFAULT_ORG_ID}`).catch(() => null),
      ]);
      setForm(bookingsData);
      setShippingLineOptions(buildShippingLineOptions(contractData, bookingsData.shippingLine));
    } catch (loadError) {
      setError((loadError as Error).message);
    } finally {
      setLoading(false);
    }
  }, [contractId]);

  useEffect(() => {
    void load();
  }, [load]);

  function updateHeader<K extends keyof BookingsSheet>(key: K, value: BookingsSheet[K]) {
    setForm((current) => current ? { ...current, [key]: value } : current);
  }

  function updateEntry(index: number, key: keyof BookingsSheet["entries"][number], value: string) {
    setForm((current) => {
      if (!current) {
        return current;
      }

      const entries = current.entries.map((entry, entryIndex) => {
        if (entryIndex !== index) {
          return entry;
        }

        if (key === "tareWeightKg") {
          return { ...entry, [key]: value === "" ? undefined : Number(value) };
        }

        if (key === "vehicleNo") {
          return { ...entry, [key]: value === "" ? undefined : Number(value) };
        }

        return { ...entry, [key]: value };
      });

      return { ...current, entries: syncBookingEntryPairs(entries) };
    });
  }

  function addVehiclePair() {
    setForm((current) => current ? { ...current, entries: appendVehiclePair(current.entries) } : current);
  }

  function removeVehiclePair() {
    setForm((current) => current ? { ...current, entries: removeLastVehiclePair(current.entries) } : current);
  }

  async function save() {
    if (!form) {
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await apiClient("/api/contracts/" + contractId + "/execution/bookings", {
        method: "POST",
        body: JSON.stringify({
          orgId: DEFAULT_ORG_ID,
          bookings: {
            bookingNumber: form.bookingNumber,
            shippingLine: form.shippingLine,
            vesselName: form.vesselName,
            voyageNo: form.voyageNo,
            freeDays: form.freeDays,
            billOfLadingNumber: form.billOfLadingNumber,
            hasSecondSeal: form.hasSecondSeal ?? false,
            entries: form.entries,
          },
        }),
      });
      await load();
    } catch (saveError) {
      setError((saveError as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="card">
        <CenteredLoader label="Loading bookings..." />
      </section>
    );
  }

  if (!form) {
    return (
      <section className="card">
        <p className="error-text">{error ?? "Unable to load bookings."}</p>
      </section>
    );
  }

  return (
    <section className="page-shell bookings-page">
      <header className="page-header">
        <h1>Bookings</h1>
        <p>Bookings are captured as vehicle pairs. The truck and its trailer share the same driver, phone numbers, and license, so those details are entered once on the truck row and carried to the trailer automatically.</p>
      </header>

      <section className="card form-grid bookings-header-grid">
        <label>
          Booking Number
          <input value={form.bookingNumber ?? ""} onChange={(event) => updateHeader("bookingNumber", event.target.value)} />
        </label>
        <label>
          Shipping Line
          <select
            value={form.shippingLine ?? ""}
            onChange={(event) => updateHeader("shippingLine", event.target.value)}
          >
            <option value="">Select shipping line</option>
            {shippingLineOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <small>
            {shippingLineOptions.length === 0
              ? "No options found in Shipping Instruction yet. Add Shipping Line or Alternatives there first."
              : ""}
          </small>
        </label>
        <label>
          Vessel Name
          <input value={form.vesselName ?? ""} onChange={(event) => updateHeader("vesselName", event.target.value)} />
        </label>
        <label>
          Voyage No
          <input value={form.voyageNo ?? ""} onChange={(event) => updateHeader("voyageNo", event.target.value)} />
        </label>
        <label>
          Free Days
          <input value={form.freeDays ?? ""} onChange={(event) => updateHeader("freeDays", event.target.value)} />
        </label>
        <label>
          Bill of Lading Number
          <input value={form.billOfLadingNumber ?? ""} onChange={(event) => updateHeader("billOfLadingNumber", event.target.value)} />
        </label>
      </section>

      <section className="card bookings-vehicle-card">
        <div className="section-heading">
          <div>
            <h3>Vehicle Rows</h3>
            <p className="sidebar-subtitle">Each added vehicle creates a truck row and its paired trailer row. Staffing follows these rows automatically.</p>
          </div>
          <div className="row-actions">
            <button type="button" onClick={addVehiclePair} disabled={saving}>Add Vehicle</button>
            <button type="button" className="button-secondary" onClick={removeVehiclePair} disabled={saving || form.entries.length <= 2}>Remove Last Vehicle</button>
            <button type="button" className="button-secondary" onClick={() => void load()} disabled={saving}>Refresh</button>
            <button type="button" onClick={() => void save()} disabled={saving}>{saving ? "Saving..." : "Save Bookings"}</button>
          </div>
        </div>
        <div className="bookings-table-toolbar">
          <label className="bookings-checkbox-toggle">
            <input
              type="checkbox"
              checked={Boolean(form.hasSecondSeal)}
              onChange={(event) => updateHeader("hasSecondSeal", event.target.checked)}
            />
            <span>Second seal column</span>
          </label>
        </div>
        <div className="table-wrap bookings-vehicle-wrap">
          <table className="bookings-vehicle-table">
            <thead>
              <tr>
                <th>Row</th>
                <th>Vehicle Group</th>
                <th>Vehicle No</th>
                <th>Type</th>
                <th>Plate No</th>
                <th>Driver</th>
                <th>Phone</th>
                <th>Djibouti Phone</th>
                <th>License</th>
                <th>Container</th>
                <th>Seal</th>
                {form.hasSecondSeal ? <th>Second Seal</th> : null}
                <th>Tare Kg</th>
              </tr>
            </thead>
            <tbody>
              {form.entries.map((entry, index) => (
                <tr key={entry.rowNo}>
                  <td>{entry.rowNo}</td>
                  <td>{entry.vehicleNo ? `Vehicle ${entry.vehicleNo}` : "Trailer"}</td>
                  <td>{entry.vehicleNo ?? "-"}</td>
                  <td>
                    {entry.vehicleType}
                  </td>
                  <td><input value={entry.plateNo ?? ""} onChange={(event) => updateEntry(index, "plateNo", event.target.value)} /></td>
                  <td>
                    <input
                      value={entry.driverName ?? ""}
                      onChange={(event) => updateEntry(index, "driverName", event.target.value)}
                      disabled={entry.vehicleType === "TRAILER"}
                    />
                  </td>
                  <td>
                    <input
                      value={entry.driverPhoneNo ?? ""}
                      onChange={(event) => updateEntry(index, "driverPhoneNo", event.target.value)}
                      disabled={entry.vehicleType === "TRAILER"}
                    />
                  </td>
                  <td>
                    <input
                      value={entry.djiboutiPhoneNo ?? ""}
                      onChange={(event) => updateEntry(index, "djiboutiPhoneNo", event.target.value)}
                      disabled={entry.vehicleType === "TRAILER"}
                    />
                  </td>
                  <td>
                    <input
                      value={entry.licenseNo ?? ""}
                      onChange={(event) => updateEntry(index, "licenseNo", event.target.value)}
                      disabled={entry.vehicleType === "TRAILER"}
                    />
                  </td>
                  <td><input value={entry.containerNumber ?? ""} onChange={(event) => updateEntry(index, "containerNumber", event.target.value)} /></td>
                  <td><input className="bookings-seal-input" value={entry.sealNumber ?? ""} onChange={(event) => updateEntry(index, "sealNumber", event.target.value)} /></td>
                  {form.hasSecondSeal ? (
                    <td><input className="bookings-seal-input" value={entry.secondSealNumber ?? ""} onChange={(event) => updateEntry(index, "secondSealNumber", event.target.value)} /></td>
                  ) : null}
                  <td><input className="bookings-tare-input" type="number" step="0.001" value={entry.tareWeightKg ?? ""} onChange={(event) => updateEntry(index, "tareWeightKg", event.target.value)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {error ? <p className="error-text mt-md">{error}</p> : null}
      </section>
    </section>
  );
}

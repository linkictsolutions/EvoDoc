"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiClient } from "@/lib/api/client";
import { DEFAULT_ORG_ID } from "@/lib/config";
import { collectSealOptions, deriveFinalStaffingRows } from "@/domain/execution";
import type { BookingsSheet, StaffingFinalRow, StaffingSheet } from "@/types/models";

type StaffingPayload = StaffingSheet & { finalRows: StaffingFinalRow[] };

export function StaffingPage({ contractId }: { contractId: string }) {
  const [bookings, setBookings] = useState<BookingsSheet | null>(null);
  const [form, setForm] = useState<StaffingPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [bookingsData, staffingData] = await Promise.all([
        apiClient<BookingsSheet>(`/api/contracts/${contractId}/execution/bookings?orgId=${DEFAULT_ORG_ID}`),
        apiClient<StaffingPayload>(`/api/contracts/${contractId}/execution/staffing?orgId=${DEFAULT_ORG_ID}`),
      ]);
      setBookings(bookingsData);
      setForm(staffingData);
    } catch (loadError) {
      setError((loadError as Error).message);
    } finally {
      setLoading(false);
    }
  }, [contractId]);

  useEffect(() => {
    void load();
  }, [load]);

  const sealOptions = useMemo(() => collectSealOptions(bookings ?? undefined), [bookings]);

  function updateRow(index: number, key: keyof StaffingSheet["instructionRows"][number], value: string) {
    setForm((current) => {
      if (!current) {
        return current;
      }

      const instructionRows = current.instructionRows.map((row, rowIndex) => {
        if (rowIndex !== index) {
          return row;
        }

        if (["tareWeightKg", "firstWeightKg", "secondWeightKg", "netWeightKg"].includes(String(key))) {
          return { ...row, [key]: value === "" ? undefined : Number(value) };
        }

        return { ...row, [key]: value };
      });

      return {
        ...current,
        instructionRows,
        finalRows: deriveFinalStaffingRows({ ...current, instructionRows }),
      };
    });
  }

  async function save() {
    if (!form) {
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await apiClient(`/api/contracts/${contractId}/execution/staffing`, {
        method: "POST",
        body: JSON.stringify({
          orgId: DEFAULT_ORG_ID,
          staffing: {
            instructionRows: form.instructionRows,
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

  if (loading || !form) {
    return <section className="card"><p>Loading staffing...</p></section>;
  }

  return (
    <section className="page-shell">
      <header className="page-header">
        <h1>Staffing</h1>
        <p>Staffing stays parallel to Bookings. Add or remove vehicles in Bookings first, then refresh here to sync rows and seal options before saving staffing details.</p>
      </header>

      <section className="card">
        <div className="section-heading">
          <div>
            <h3>Staffing Instruction &amp; Report</h3>
            <p className="sidebar-subtitle">Workbook rows 6 to 15. Plate, driver, phone, license, container, and tare weight are sourced from Bookings.</p>
          </div>
          <div className="row-actions">
            <button type="button" className="button-secondary" onClick={() => void load()} disabled={saving}>Refresh from Bookings</button>
            <button type="button" onClick={() => void save()} disabled={saving}>{saving ? "Saving..." : "Save Staffing"}</button>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Row</th>
                <th>Vehicle</th>
                <th>Type</th>
                <th>Plate</th>
                <th>Driver</th>
                <th>Driver Phone</th>
                <th>License</th>
                <th>Container</th>
                <th>Seal No</th>
                <th>Seal No V2</th>
                <th>Cert No</th>
                <th>Cert No V2</th>
                <th>Tare Kg</th>
                <th>First Weight</th>
                <th>Second Weight</th>
                <th>Net Weight</th>
                <th>DO No</th>
              </tr>
            </thead>
            <tbody>
              {form.instructionRows.map((row, index) => (
                <tr key={row.rowNo}>
                  <td>{row.rowNo}</td>
                  <td>{row.vehicleNo ?? "-"}</td>
                  <td>{row.vehicleType}</td>
                  <td>{row.plateNo ?? "-"}</td>
                  <td>{row.driverName ?? "-"}</td>
                  <td>{row.driverPhoneNo ?? "-"}</td>
                  <td>{row.licenseNo ?? "-"}</td>
                  <td>{row.containerNumber ?? "-"}</td>
                  <td>
                    <select value={row.sealNumber ?? ""} onChange={(event) => updateRow(index, "sealNumber", event.target.value)}>
                      <option value="">Select seal</option>
                      {sealOptions.map((seal) => <option key={seal} value={seal}>{seal}</option>)}
                    </select>
                  </td>
                  <td>
                    <select value={row.sealNumberV2 ?? ""} onChange={(event) => updateRow(index, "sealNumberV2", event.target.value)}>
                      <option value="">No override</option>
                      {sealOptions.map((seal) => <option key={`v2-${seal}`} value={seal}>{seal}</option>)}
                    </select>
                  </td>
                  <td><input value={row.certNumber ?? ""} onChange={(event) => updateRow(index, "certNumber", event.target.value)} /></td>
                  <td><input value={row.certNumberV2 ?? ""} onChange={(event) => updateRow(index, "certNumberV2", event.target.value)} /></td>
                  <td>{row.tareWeightKg ?? "-"}</td>
                  <td><input type="number" step="0.001" value={row.firstWeightKg ?? ""} onChange={(event) => updateRow(index, "firstWeightKg", event.target.value)} /></td>
                  <td><input type="number" step="0.001" value={row.secondWeightKg ?? ""} onChange={(event) => updateRow(index, "secondWeightKg", event.target.value)} /></td>
                  <td><input type="number" step="0.001" value={row.netWeightKg ?? ""} onChange={(event) => updateRow(index, "netWeightKg", event.target.value)} /></td>
                  <td><input value={row.doNumber ?? ""} onChange={(event) => updateRow(index, "doNumber", event.target.value)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {error ? <p className="error-text mt-md">{error}</p> : null}
      </section>

      <section className="card">
        <h3>Final Staffing Report Preview</h3>
        <div className="table-wrap mt-md">
          <table>
            <thead>
              <tr>
                <th>Row</th>
                <th>Vehicle</th>
                <th>Type</th>
                <th>Plate</th>
                <th>Driver</th>
                <th>Driver Phone</th>
                <th>License</th>
                <th>Container</th>
                <th>Seal</th>
                <th>Cert</th>
                <th>Tare Kg</th>
                <th>First Weight</th>
                <th>Second Weight</th>
                <th>Net Weight</th>
                <th>DO No</th>
              </tr>
            </thead>
            <tbody>
              {form.finalRows.map((row) => (
                <tr key={`final-${row.rowNo}`}>
                  <td>{row.rowNo}</td>
                  <td>{row.vehicleNo ?? "-"}</td>
                  <td>{row.vehicleType}</td>
                  <td>{row.plateNo ?? "-"}</td>
                  <td>{row.driverName ?? "-"}</td>
                  <td>{row.driverPhoneNo ?? "-"}</td>
                  <td>{row.licenseNo ?? "-"}</td>
                  <td>{row.containerNumber ?? "-"}</td>
                  <td>{row.sealNumber ?? "-"}</td>
                  <td>{row.certNumber ?? "-"}</td>
                  <td>{row.tareWeightKg ?? "-"}</td>
                  <td>{row.firstWeightKg ?? "-"}</td>
                  <td>{row.secondWeightKg ?? "-"}</td>
                  <td>{row.netWeightKg ?? "-"}</td>
                  <td>{row.doNumber ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}

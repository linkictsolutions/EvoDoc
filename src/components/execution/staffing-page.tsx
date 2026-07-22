"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiClient } from "@/lib/api/client";
import { DEFAULT_ORG_ID } from "@/lib/config";
import { computeContractExcelParity } from "@/domain/excel-parity";
import { applyCalculatedStaffingWeights, collectSealOptions, deriveFinalStaffingRows } from "@/domain/execution";
import type { BookingsSheet, Contract, StaffingFinalRow, StaffingSheet } from "@/types/models";
import { CenteredLoader } from "@/components/ui/centered-loader";
import { useToast } from "@/components/ui/toast";
import { useUnsavedChangesGuard } from "@/components/ui/use-unsaved-changes-guard";

type StaffingPayload = StaffingSheet & { finalRows: StaffingFinalRow[] };
type ContractDetailResponse = {
  contract: Pick<Contract, "terms" | "derived">;
};

function formatWeightValue(value?: number) {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(3) : "-";
}

export function StaffingPage({ contractId }: { contractId: string }) {
  const toast = useToast();
  const [bookings, setBookings] = useState<BookingsSheet | null>(null);
  const [form, setForm] = useState<StaffingPayload | null>(null);
  const [contract, setContract] = useState<ContractDetailResponse["contract"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlightDirty, setHighlightDirty] = useState(false);
  const lastSavedRowsRef = useRef<StaffingSheet["instructionRows"]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [bookingsData, staffingData, contractData] = await Promise.all([
        apiClient<BookingsSheet>(`/api/contracts/${contractId}/execution/bookings?orgId=${DEFAULT_ORG_ID}`),
        apiClient<StaffingPayload>(`/api/contracts/${contractId}/execution/staffing?orgId=${DEFAULT_ORG_ID}`),
        apiClient<ContractDetailResponse>(`/api/contracts/${contractId}?orgId=${DEFAULT_ORG_ID}`),
      ]);
      const instructionRows = applyCalculatedStaffingWeights(staffingData.instructionRows, contractData.contract);
      const nextForm = {
        ...staffingData,
        instructionRows,
        finalRows: deriveFinalStaffingRows({ ...staffingData, instructionRows }),
      };
      setBookings(bookingsData);
      setForm(nextForm);
      lastSavedRowsRef.current = instructionRows;
      setHighlightDirty(false);
      setContract(contractData.contract);
    } catch (loadError) {
      setError((loadError as Error).message);
    } finally {
      setLoading(false);
    }
  }, [contractId]);

  useEffect(() => {
    void load();
  }, [load]);

  const isDirty = useMemo(() => {
    if (!form) {
      return false;
    }
    return JSON.stringify(form.instructionRows) !== JSON.stringify(lastSavedRowsRef.current);
  }, [form]);

  useUnsavedChangesGuard({ enabled: isDirty && !saving, onBlockedNavigation: () => setHighlightDirty(true) });

  const sealOptions = useMemo(() => collectSealOptions(bookings ?? undefined), [bookings]);
  const containerCount = useMemo(() => {
    if (contract?.derived?.containerCount && contract.derived.containerCount > 0) {
      return contract.derived.containerCount;
    }

    if (contract?.terms) {
      const parityContainerCount = computeContractExcelParity(contract.terms).containerCount;
      if (parityContainerCount > 0) {
        return parityContainerCount;
      }
    }

    const truckRows = form?.instructionRows.filter((row) => row.vehicleType === "TRUCK").length ?? 0;
    return Math.max(0, truckRows);
  }, [contract, form]);
  const certOptions = useMemo(() => {
    if (containerCount <= 0) {
      return [];
    }

    const start = Math.max(0, contract?.terms.lastCertNo ?? 0) + 1;
    return Array.from({ length: containerCount }, (_, index) => String(start + index).padStart(4, "0"));
  }, [containerCount, contract]);
  const certSequenceHint = useMemo(() => {
    if (certOptions.length === 0) {
      return "Set Last Cert No on Contract and ensure container count is available to generate cert options.";
    }
    return `Cert sequence: ${certOptions[0]} to ${certOptions[certOptions.length - 1]} (${containerCount} containers).`;
  }, [certOptions, containerCount]);

  function updateRow(index: number, key: keyof StaffingSheet["instructionRows"][number], value: string) {
    setForm((current) => {
      if (!current) {
        return current;
      }

      const instructionRows = current.instructionRows.map((row, rowIndex) => {
        if (rowIndex !== index) {
          return row;
        }

        if (["tareWeightKg"].includes(String(key))) {
          return { ...row, [key]: value === "" ? undefined : Number(value) };
        }

        return { ...row, [key]: value };
      });

      const nextRows = applyCalculatedStaffingWeights(instructionRows, contract ?? undefined);

      return {
        ...current,
        instructionRows: nextRows,
        finalRows: deriveFinalStaffingRows({ ...current, instructionRows: nextRows }),
      };
    });
  }

  function discardChanges() {
    if (!form) {
      return;
    }
    const instructionRows = lastSavedRowsRef.current;
    setForm((current) => current ? { ...current, instructionRows, finalRows: deriveFinalStaffingRows({ ...current, instructionRows }) } : current);
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
      toast.success("Staffing saved.");
    } catch (saveError) {
      setError((saveError as Error).message);
      toast.error("Unable to save staffing.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="card">
        <CenteredLoader label="Loading staffing..." />
      </section>
    );
  }

  if (!form) {
    return (
      <section className="card">
        <p className="error-text">{error ?? "Unable to load staffing."}</p>
      </section>
    );
  }

  const controlClass = highlightDirty && isDirty ? "field-error-control" : undefined;

  return (
    <section className="page-shell staffing-page">
      <section className="card staffing-entry-card">
        <div className="section-heading">
          <div>
            <h3>Staffing Instruction &amp; Report</h3>
            <p className="sidebar-subtitle">Staffing stays parallel to Bookings. Add or remove vehicles in Bookings first, then refresh here to sync rows before saving staffing details.</p>
          </div>
          <div className="row-actions">
            <button type="button" className="button-secondary" onClick={() => void load()} disabled={saving}>Refresh from Bookings</button>
            <button type="button" className="button-secondary" onClick={discardChanges} disabled={!isDirty || saving}>Discard changes</button>
            <button type="button" onClick={() => void save()} disabled={saving}>{saving ? "Saving..." : "Save Staffing"}</button>
          </div>
        </div>
        <p className="table-meta">{certSequenceHint}</p>
        <div className="table-wrap staffing-main-wrap">
          <table className="staffing-main-table">
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
                <th>Cert No</th>
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
                    <select className={controlClass} value={row.sealNumber ?? ""} onChange={(event) => updateRow(index, "sealNumber", event.target.value)}>
                      <option value="">Select seal</option>
                      {sealOptions.map((seal) => <option key={seal} value={seal}>{seal}</option>)}
                    </select>
                  </td>
                  <td>
                    <select
                      className={controlClass}
                      value={row.certNumber ?? ""}
                      onChange={(event) => updateRow(index, "certNumber", event.target.value)}
                      disabled={certOptions.length === 0}
                    >
                      <option value="">{certOptions.length > 0 ? "Select cert" : "No cert options yet"}</option>
                      {certOptions.map((certNo) => <option key={certNo} value={certNo}>{certNo}</option>)}
                    </select>
                  </td>
                  <td>{formatWeightValue(row.tareWeightKg)}</td>
                  <td>{formatWeightValue(row.firstWeightKg)}</td>
                  <td>{formatWeightValue(row.secondWeightKg)}</td>
                  <td>{formatWeightValue(row.netWeightKg)}</td>
                  <td><input className={controlClass} value={row.doNumber ?? ""} onChange={(event) => updateRow(index, "doNumber", event.target.value)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {error ? <p className="error-text mt-md">{error}</p> : null}
      </section>

      <section className="card">
        <h3>Final Staffing Report Preview</h3>
        <div className="table-wrap mt-md staffing-preview-wrap">
          <table className="staffing-preview-table">
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

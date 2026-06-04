"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api/client";
import { DEFAULT_ORG_ID } from "@/lib/config";
import { CenteredLoader } from "@/components/ui/centered-loader";

type Row = {
  rowNumber: number;
  label: string;
  contractValue: string;
  shippingValue: string;
  revisedShippingValue: string;
  lcValue: string;
  revisedLcValue: string;
  finalValue: string;
  finalSource: string;
};

type Report = {
  contractId: string;
  contractNumber: string;
  customerName: string;
  precedence: string;
  rows: Row[];
};

interface ContractSiLcReportViewProps {
  initialContractId?: string;
}

function displayResolvedValue(value: string): string {
  return value.replace(/\\n/g, "\n");
}

function valueCellClass(label: string, value: string): string {
  if (/\r?\n/.test(value) || /description|marking/i.test(label)) {
    return "preserve-linebreaks";
  }

  return "multiline-cell";
}

export function ContractSiLcReportView({ initialContractId }: ContractSiLcReportViewProps) {
  const [contractId, setContractId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<Report | null>(null);

  async function loadReport(targetContractId: string) {
    const normalizedId = targetContractId.trim();
    if (!normalizedId) {
      setError("Contract ID is required.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await apiClient<Report>(
        `/api/contracts/${normalizedId}/contract-si-lc?orgId=${DEFAULT_ORG_ID}`,
      );
      setReport(data);
      setContractId(data.contractId);

      if (typeof window !== "undefined") {
        window.localStorage.setItem("evodoc.contractId", data.contractId);
      }
    } catch (loadError) {
      setError((loadError as Error).message);
      setReport(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const queryContractId = initialContractId ?? (typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("contractId")
      : null);
    const rememberedContractId =
      typeof window !== "undefined" ? window.localStorage.getItem("evodoc.contractId") : null;
    const initial = queryContractId ?? rememberedContractId ?? "";

    if (!initial) {
      return;
    }

    setContractId(initial);
    void loadReport(initial);
  }, [initialContractId]);

  return (
    <section className="page-shell">
      <header className="page-header">
        <h1>Resolved Values</h1>
        <p>Review merged values from contract, shipping, and bank details.</p>
        {initialContractId ? (
          <p className="sidebar-subtitle">This view shows the current merged values for this contract.</p>
        ) : null}
      </header>

      {!initialContractId ? (
        <section className="card">
          <div className="row-actions">
            <label className="minw-320">
              Contract ID
              <input value={contractId} onChange={(event) => setContractId(event.target.value)} />
            </label>
            <button type="button" onClick={() => void loadReport(contractId)} disabled={loading}>
              {loading ? "Loading..." : "Load Resolved Values"}
            </button>
          </div>
          {error ? <p className="error-text mt-md">{error}</p> : null}
          {loading && !report ? <CenteredLoader label="Loading resolved values..." scope="inline" /> : null}
        </section>
      ) : null}

      {initialContractId && error ? (
        <section className="card">
          <p className="error-text">{error}</p>
        </section>
      ) : null}

      {initialContractId && loading && !report && !error ? (
        <section className="card">
          <CenteredLoader label="Loading resolved values..." />
        </section>
      ) : null}

      {report ? (
        <section className="card">
          <h3>Contract #{report.contractNumber}</h3>
          <p>Buyer: {report.customerName}</p>
          <p className="muted-text mt-sm">Priority order is applied from latest updates to base contract values.</p>
          <div className="table-wrap mt-md resolved-values-wrap">
            <table className="resolved-values-table">
              <thead>
                <tr>
                  <th>Field</th>
                  <th>Contract</th>
                  <th>Shipping</th>
                  <th>Bank &amp; LC</th>
                  <th>Final Value</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {report.rows.map((row) => (
                  <tr key={`${row.rowNumber}-${row.label}`}>
                    <td className="wrap">{row.label}</td>
                    <td className={valueCellClass(row.label, row.contractValue)}>
                      {displayResolvedValue(row.contractValue || "-")}
                    </td>
                    <td className={valueCellClass(row.label, row.shippingValue)}>
                      {displayResolvedValue(row.shippingValue || "-")}
                    </td>
                    <td className={valueCellClass(row.label, row.lcValue)}>
                      {displayResolvedValue(row.lcValue || "-")}
                    </td>
                    <td className={valueCellClass(row.label, row.finalValue)}>
                      <strong>{displayResolvedValue(row.finalValue)}</strong>
                    </td>
                    <td><span className={`source-badge source-${row.finalSource}`}>{row.finalSource}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </section>
  );
}

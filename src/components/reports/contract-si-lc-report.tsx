"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api/client";
import { DEFAULT_ORG_ID } from "@/lib/config";

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
        <h1>{initialContractId ? "Resolved Values" : "Contract-SI-LC Final Report"}</h1>
        <p>
          Final resolution follows workbook precedence: <strong>J &gt; I &gt; H &gt; G &gt; F</strong>.
        </p>
        {initialContractId ? (
          <p className="sidebar-subtitle">This is the web-app version of the Excel consolidation layer.</p>
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
              {loading ? "Loading..." : "Load Final Report"}
            </button>
          </div>
          {error ? <p className="error-text mt-md">{error}</p> : null}
        </section>
      ) : null}

      {initialContractId && error ? (
        <section className="card">
          <p className="error-text">{error}</p>
        </section>
      ) : null}

      {report ? (
        <section className="card">
          <h3>Contract #{report.contractNumber}</h3>
          <p>Buyer: {report.customerName}</p>
          <p className="muted-text mt-sm">{report.precedence}</p>
          <div className="table-wrap mt-md">
            <table>
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Field</th>
                  <th>Contract (F)</th>
                  <th>SI (G)</th>
                  <th>Rev SI (H)</th>
                  <th>LC (I)</th>
                  <th>Rev LC (J)</th>
                  <th>Final (K)</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {report.rows.map((row) => (
                  <tr key={row.rowNumber}>
                    <td>{row.rowNumber}</td>
                    <td className="wrap">{row.label}</td>
                    <td>{row.contractValue || "-"}</td>
                    <td>{row.shippingValue || "-"}</td>
                    <td>{row.revisedShippingValue || "-"}</td>
                    <td>{row.lcValue || "-"}</td>
                    <td>{row.revisedLcValue || "-"}</td>
                    <td><strong>{row.finalValue}</strong></td>
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

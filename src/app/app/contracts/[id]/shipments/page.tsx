"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api/client";
import { DEFAULT_ORG_ID } from "@/lib/config";

type ContractDetail = {
  contract: {
    id: string;
    contractNumber: string;
    status: string;
  };
  shipments: Array<{
    id: string;
    status: string;
    updatedAt: string;
    totals?: {
      totalBags: number;
      totalNetWeightKg: number;
    };
  }>;
};

export default function ContractShipmentsPage({ params }: { params: Promise<{ id: string }> }) {
  const [state, setState] = useState<ContractDetail | null>(null);
  const [contractId, setContractId] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    Promise.resolve(params)
      .then(async ({ id }) => {
        if (!mounted) {
          return;
        }

        setContractId(id);
        const data = await apiClient<ContractDetail>(`/api/contracts/${id}?orgId=${DEFAULT_ORG_ID}`);
        if (mounted) {
          setState(data);
        }
      })
      .catch((loadError: Error) => {
        if (mounted) {
          setError(loadError.message);
        }
      });

    return () => {
      mounted = false;
    };
  }, [params]);

  if (error) {
    return <section className="card"><p className="error-text">{error}</p></section>;
  }

  if (!state) {
    return <section className="card"><p>Loading shipments...</p></section>;
  }

  return (
    <section className="page-shell">
      <header className="page-header">
        <h1>Shipments</h1>
        <p>Capture booking execution records and attach document generation to the latest ready shipment.</p>
        <div className="row-actions" style={{ marginTop: "0.75rem" }}>
          <Link href={`/app/contracts/${contractId}/shipments/new`}>
            <button type="button">Add Shipment</button>
          </Link>
        </div>
      </header>

      <section className="card">
        <table>
          <thead>
            <tr>
              <th>Shipment ID</th>
              <th>Status</th>
              <th>Total Bags</th>
              <th>Net Weight</th>
              <th>Updated</th>
              <th>Open</th>
            </tr>
          </thead>
          <tbody>
            {state.shipments.length === 0 ? (
              <tr><td colSpan={6}>No shipments yet.</td></tr>
            ) : (
              state.shipments.map((shipment) => (
                <tr key={shipment.id}>
                  <td>{shipment.id}</td>
                  <td>{shipment.status}</td>
                  <td>{shipment.totals?.totalBags ?? "-"}</td>
                  <td>{shipment.totals?.totalNetWeightKg ?? "-"} kg</td>
                  <td>{new Date(shipment.updatedAt).toLocaleString()}</td>
                  <td>
                    <Link href={`/app/contracts/${contractId}/shipments/${shipment.id}`}>Open</Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </section>
  );
}

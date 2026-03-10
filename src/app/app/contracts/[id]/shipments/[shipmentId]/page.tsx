"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ShipmentForm } from "@/components/forms/shipment-form";
import { apiClient } from "@/lib/api/client";
import { DEFAULT_ORG_ID } from "@/lib/config";

type ContractDetail = {
  shipments: Array<{
    id: string;
    status: string;
    totals: {
      totalBags: number;
      totalNetWeightKg: number;
    };
    updatedAt: string;
  }>;
};

export default function ShipmentPage({
  params,
}: {
  params: Promise<{ id: string; shipmentId: string }>;
}) {
  const [contractId, setContractId] = useState("");
  const [shipmentId, setShipmentId] = useState("");
  const [shipment, setShipment] = useState<ContractDetail["shipments"][number] | null>(null);

  useEffect(() => {
    let mounted = true;

    Promise.resolve(params)
      .then(async ({ id, shipmentId: routeShipmentId }) => {
        if (!mounted) return;
        setContractId(id);
        setShipmentId(routeShipmentId);

        if (routeShipmentId === "new") {
          return;
        }

        const detail = await apiClient<ContractDetail>(`/api/contracts/${id}?orgId=${DEFAULT_ORG_ID}`);
        const found = detail.shipments.find((item) => item.id === routeShipmentId) ?? null;
        setShipment(found);
      })
      .catch(() => {
        // no-op
      });

    return () => {
      mounted = false;
    };
  }, [params]);

  if (shipmentId === "new" || !shipmentId) {
    return (
      <section className="page-shell">
        <header className="page-header">
          <h1>Add Shipment</h1>
          <p>Capture booking line totals and persist shipment draft.</p>
        </header>
        {contractId ? <ShipmentForm contractId={contractId} /> : <p>Loading...</p>}
      </section>
    );
  }

  return (
    <section className="page-shell">
      <header className="page-header">
        <h1>Shipment {shipmentId}</h1>
      </header>

      {!shipment ? (
        <section className="card"><p>Loading shipment...</p></section>
      ) : (
        <section className="card">
          <p>Status: {shipment.status}</p>
          <p>Total Bags: {shipment.totals.totalBags}</p>
          <p>Total Net Weight: {shipment.totals.totalNetWeightKg} kg</p>
          <div className="row-actions" style={{ marginTop: "0.75rem" }}>
            <Link
              href={`/app/contracts/${contractId}/documents/template/invoice/draft?shipmentId=${shipmentId}`}
            >
              <button type="button">Generate Invoice</button>
            </Link>
            <Link
              href={`/app/contracts/${contractId}/documents/template/packing_list/draft?shipmentId=${shipmentId}`}
            >
              <button type="button">Generate Packing List</button>
            </Link>
            <Link
              href={`/app/contracts/${contractId}/documents/template/shipping_instructions/draft?shipmentId=${shipmentId}`}
            >
              <button type="button">Generate SI</button>
            </Link>
          </div>
        </section>
      )}
    </section>
  );
}

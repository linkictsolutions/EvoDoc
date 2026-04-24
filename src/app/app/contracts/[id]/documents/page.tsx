"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api/client";
import { DEFAULT_ORG_ID } from "@/lib/config";
import { CenteredLoader } from "@/components/ui/centered-loader";

type ContractDetail = {
  contract: {
    id: string;
  };
  shipments: Array<{ id: string }>;
  documents: Array<{
    id: string;
    docType: "invoice" | "packing_list" | "shipping_instructions" | "quality_certificate" | "weight_certificate" | "way_bill";
    documentFamily?:
      | "commercial_invoice"
      | "packing_list"
      | "shipping_instruction"
      | "certificate_of_quality"
      | "certificate_of_weight"
      | "way_bill";
    revisionNumber?: number;
    status: string;
    isFinal?: boolean;
    updatedAt: string;
  }>;
};

type FamilyCard = {
  family:
    | "commercial_invoice"
    | "packing_list"
    | "shipping_instruction"
    | "certificate_of_quality"
    | "certificate_of_weight"
    | "way_bill";
  label: string;
  description: string;
};

const families: FamilyCard[] = [
  {
    family: "commercial_invoice",
    label: "Commercial Invoice (ICC)",
    description: "ICC export invoice generated from contract, shipping, bank, and execution data.",
  },
  {
    family: "packing_list",
    label: "Packing List (ICC)",
    description: "ICC packing list generated from contract, resolved values, bookings, staffing containers, and processing details.",
  },
  {
    family: "shipping_instruction",
    label: "Shipping Instruction",
    description: "Carrier-facing shipping instruction generated from final resolved contract values.",
  },
  {
    family: "certificate_of_quality",
    label: "Certificate of Quality",
    description: "Quality certificate generated from resolved values, bookings, processing moisture, and staffing containers.",
  },
  {
    family: "certificate_of_weight",
    label: "Certificate of Weight",
    description: "Weight certificate generated from resolved values and prepared staffing containers with per-container totals.",
  },
  {
    family: "way_bill",
    label: "Way Bill",
    description: "Driver-based waybill generated from staffing rows with per-driver tabs including truck, trailer, and seal details.",
  },
];

function familyMatches(
  family: FamilyCard["family"],
  document: ContractDetail["documents"][number],
) {
  const storedFamily = document.documentFamily
    ?? (document.docType === "invoice"
      ? "commercial_invoice"
      : document.docType === "packing_list"
        ? "packing_list"
        : document.docType === "shipping_instructions"
          ? "shipping_instruction"
          : document.docType === "quality_certificate"
            ? "certificate_of_quality"
            : document.docType === "weight_certificate"
              ? "certificate_of_weight"
              : "way_bill");

  return storedFamily === family;
}

export default function ContractDocumentsPage({ params }: { params: Promise<{ id: string }> }) {
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
    return (
      <section className="card">
        <CenteredLoader label="Loading documents..." />
      </section>
    );
  }

  return (
    <section className="page-shell">
      <header className="page-header">
        <h1>Documents</h1>
        <p>Each document keeps one revision stream. Generate new revisions as data changes, then mark an approved revision as final.</p>
      </header>

      <section className="document-family-grid">
        {families.map((family) => {
          const revisions = state.documents.filter((document) => familyMatches(family.family, document));
          const latest = revisions[0];

          return (
            <article key={family.family} className="card document-family-card">
              <div className="section-heading">
                <div>
                  <h3>{family.label}</h3>
                  <p className="sidebar-subtitle">{family.description}</p>
                </div>
                <span className="source-badge source-contract">{revisions.length} rev</span>
              </div>

              <p><strong>Latest Revision:</strong> {latest ? `v${latest.revisionNumber ?? 1}` : "None yet"}</p>
              <p>
                <strong>Latest Status:</strong>{" "}
                <span className={`status-pill status-${(latest?.status ?? "draft").toLowerCase().replace(/\s+/g, "-")}`}>
                  {latest?.status ?? "Not generated"}
                </span>
              </p>

              <div className="row-actions mt-lg">
                <Link href={`/app/contracts/${contractId}/documents/${family.family}`}>
                  <button type="button">Open Document</button>
                </Link>
              </div>
            </article>
          );
        })}
      </section>
    </section>
  );
}

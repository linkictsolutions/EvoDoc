"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api/client";
import { DEFAULT_ORG_ID } from "@/lib/config";

type ContractDetail = {
  contract: {
    id: string;
  };
  shipments: Array<{ id: string }>;
  documents: Array<{
    id: string;
    docType: "invoice" | "packing_list" | "shipping_instructions";
    docVariant?: "permit" | "final" | "standard";
    documentFamily?: "commercial_invoice" | "packing_list" | "shipping_instruction";
    revisionNumber?: number;
    status: string;
    updatedAt: string;
  }>;
};

type FamilyCard = {
  family: "commercial_invoice" | "packing_list" | "shipping_instruction";
  label: string;
  description: string;
  variants: Array<"permit" | "final" | "standard">;
};

const families: FamilyCard[] = [
  {
    family: "commercial_invoice",
    label: "Commercial Invoice",
    description: "Invoice family with permit and final variants tied to the same contract history.",
    variants: ["permit", "final"],
  },
  {
    family: "packing_list",
    label: "Packing List",
    description: "Packing certificate generated from resolved values and shipment execution data.",
    variants: ["standard"],
  },
  {
    family: "shipping_instruction",
    label: "Shipping Instruction",
    description: "Carrier-facing shipping instruction generated from final resolved contract values.",
    variants: ["standard"],
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
        : "shipping_instruction");

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
    return <section className="card"><p>Loading documents...</p></section>;
  }

  return (
    <section className="page-shell">
      <header className="page-header">
        <h1>Document Families</h1>
        <p>Each document family renders from the current resolved contract state and keeps a revision history as the contract evolves.</p>
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

              <p><strong>Variants:</strong> {family.variants.join(" / ")}</p>
              <p><strong>Latest Revision:</strong> {latest ? `v${latest.revisionNumber ?? 1}` : "None yet"}</p>
              <p><strong>Latest Status:</strong> {latest?.status ?? "Not generated"}</p>

              <div className="row-actions" style={{ marginTop: "1rem" }}>
                <Link href={`/app/contracts/${contractId}/documents/${family.family}`}>
                  <button type="button">Open Family</button>
                </Link>
              </div>
            </article>
          );
        })}
      </section>
    </section>
  );
}

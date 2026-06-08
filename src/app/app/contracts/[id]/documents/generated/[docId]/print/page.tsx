"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DocumentPrintTemplate } from "@/components/documents/document-print-template";
import { buildBillOfLadingOutput } from "@/domain/documents/bill-of-lading";
import { apiClient } from "@/lib/api/client";
import { DEFAULT_ORG_ID } from "@/lib/config";
import { useToast } from "@/components/ui/toast";
import { CenteredLoader } from "@/components/ui/centered-loader";
import type {
  BillOfLadingInfo,
  CompanyConfiguration,
  DocumentFamily,
  DocumentInputSnapshot,
  DocumentOutputSnapshot,
  DocumentType,
} from "@/types/models";

type PrintPayload = {
  id: string;
  isFinal?: boolean;
  templateLayout?: string;
  outputSnapshot: DocumentOutputSnapshot;
  inputSnapshot: DocumentInputSnapshot;
};

function resolveFamilyFromDocType(docType: DocumentType): DocumentFamily {
  if (docType === "invoice") {
    return "commercial_invoice";
  }

  if (docType === "packing_list") {
    return "packing_list";
  }

  if (docType === "quality_certificate") {
    return "certificate_of_quality";
  }

  if (docType === "weight_certificate") {
    return "certificate_of_weight";
  }

  if (docType === "way_bill") {
    return "way_bill";
  }

  if (docType === "ico_certificate") {
    return "ico_certificate";
  }

  if (docType === "bill_of_lading") {
    return "bill_of_lading";
  }

  return "shipping_instruction";
}

export default function DocumentPrintPage({
  params,
}: {
  params: Promise<{ id: string; docId: string }>;
}) {
  const router = useRouter();
  const toast = useToast();
  const [payload, setPayload] = useState<PrintPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [familyFromQuery, setFamilyFromQuery] = useState<string | null>(null);
  const [contractNumber, setContractNumber] = useState("");
  const [savingField, setSavingField] = useState<"billType" | "shipperReferenceType" | null>(null);

  useEffect(() => {
    let mounted = true;
    Promise.resolve(params)
      .then(async ({ id, docId }) => {
        if (mounted) {
          setContractNumber(id);
        }
        const [data, companyConfiguration] = await Promise.all([
          apiClient<PrintPayload>(
            `/api/documents/${docId}/print-data?orgId=${DEFAULT_ORG_ID}&contractId=${id}`,
          ),
          apiClient<CompanyConfiguration>(`/api/company-configuration?orgId=${DEFAULT_ORG_ID}`),
        ]);

        if (mounted) {
          setPayload({
            ...data,
            inputSnapshot: {
              ...data.inputSnapshot,
              companyConfiguration,
            },
          });
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

  async function updateBillOfLadingPreview(
    patch: Partial<BillOfLadingInfo>,
    savingKey: "billType" | "shipperReferenceType",
  ) {
    if (!payload || payload.outputSnapshot.docType !== "bill_of_lading") {
      return;
    }

    const currentBill = payload.inputSnapshot.contract.billOfLading ?? {};
    const nextBill: BillOfLadingInfo = { ...currentBill, ...patch };
    const nextInputSnapshot: DocumentInputSnapshot = {
      ...payload.inputSnapshot,
      contract: {
        ...payload.inputSnapshot.contract,
        billOfLading: nextBill,
      },
    };
    const nextOutputSnapshot: DocumentOutputSnapshot = buildBillOfLadingOutput(
      nextInputSnapshot as DocumentInputSnapshot<"bill_of_lading">,
    );

    setPayload((current) => (current ? {
      ...current,
      inputSnapshot: nextInputSnapshot,
      outputSnapshot: nextOutputSnapshot,
    } : current));

    setSavingField(savingKey);
    try {
      await apiClient("/api/contracts/bill-of-lading", {
        method: "POST",
        body: JSON.stringify({
          orgId: DEFAULT_ORG_ID,
          contractId: contractNumber || payload.inputSnapshot.contract.contractNumber,
          billOfLading: nextBill,
        }),
      });
      toast.success("Bill of Lading preview updated.");
    } catch (saveError) {
      setPayload((current) => (current ? payload : current));
      toast.error((saveError as Error).message || "Unable to update Bill of Lading preview.");
    } finally {
      setSavingField(null);
    }
  }

  useEffect(() => {
    if (familyFromQuery || !payload?.outputSnapshot.docType) {
      return;
    }

    const currentPath = window.location.pathname;
    const resolved = resolveFamilyFromDocType(payload.outputSnapshot.docType);
    router.replace(`${currentPath}?family=${encodeURIComponent(resolved)}`);
  }, [familyFromQuery, payload?.outputSnapshot.docType, router]);

  useEffect(() => {
    function updateFamilyFromQuery() {
      if (typeof window === "undefined") {
        return;
      }

      const nextFamily = new URLSearchParams(window.location.search).get("family");
      setFamilyFromQuery(nextFamily);
    }

    updateFamilyFromQuery();
    window.addEventListener("popstate", updateFamilyFromQuery);

    return () => {
      window.removeEventListener("popstate", updateFamilyFromQuery);
    };
  }, []);

  if (error) {
    return (
      <main>
        <section className="card">
          <p className="error-text">{error}</p>
        </section>
      </main>
    );
  }

  if (!payload) {
    return (
      <main>
        <section className="card">
          <CenteredLoader label="Loading print data..." />
        </section>
      </main>
    );
  }

  return (
    <main className="document-print-page">
      <section className="card print-controls screen-only">
        <h1>Print Preview</h1>
        {payload.outputSnapshot.docType === "bill_of_lading" ? (
          <div className="print-preview-bill-controls">
            <label>
              Bill Type
              <select
                value={payload.inputSnapshot.contract.billOfLading?.billType ?? "ORIGINAL BILL No."}
                disabled={savingField !== null}
                onChange={(event) => updateBillOfLadingPreview({ billType: event.target.value as BillOfLadingInfo["billType"] }, "billType")}
              >
                <option value="ORIGINAL BILL No.">ORIGINAL BILL No.</option>
                <option value="WAYBILL No.">WAYBILL No.</option>
              </select>
            </label>
            <label>
              Reference Type
              <select
                value={payload.inputSnapshot.contract.billOfLading?.shipperReferenceType ?? "Booking Ref"}
                disabled={savingField !== null}
                onChange={(event) => updateBillOfLadingPreview({ shipperReferenceType: event.target.value as BillOfLadingInfo["shipperReferenceType"] }, "shipperReferenceType")}
              >
                <option value="Shipper Ref.">Shipper Ref.</option>
                <option value="Booking Ref">Booking Ref</option>
              </select>
            </label>
          </div>
        ) : null}
        <button type="button" onClick={() => window.print()}>
          Print
        </button>
      </section>
      <section className="document-print-root">
        <DocumentPrintTemplate
          output={payload.outputSnapshot}
          input={payload.inputSnapshot}
          documentId={payload.id}
          templateLayout={payload.templateLayout}
          isFinal={payload.isFinal ?? false}
        />
      </section>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DocumentPreviewBlock } from "@/components/documents/document-kv-list";
import { RevisionHistoryModal } from "@/components/documents/revision-history-modal";
import { FormSection } from "@/components/ui/form-section";
import { useTemplatePicker } from "@/components/documents/use-template-picker";
import { apiClient } from "@/lib/api/client";
import { DEFAULT_ORG_ID } from "@/lib/config";
import type { DocumentFamily, DocumentOutputSnapshot, DocumentType } from "@/types/models";
import { CenteredLoader } from "@/components/ui/centered-loader";

type FamilyPayload = {
  family: DocumentFamily;
  familyLabel: string;
  docType: DocumentType;
  refNo: string;
  icoOverrides?: {
    exporterConsignor?: string;
    notifyAddress?: string;
    internalReferenceNo?: string;
    countryCode?: string;
    portCode?: string;
    serialNo?: string;
    producingCountry?: string;
    countryDestination?: string;
    dateOfExport?: string;
    countryTransShipment?: string;
    nameOfCarrier?: string;
    icoIdentificationMark?: string;
    otherMarksIcoNo?: string;
    otherMarksCertNo?: string;
    descriptionOtherSpecify?: string;
    partBText?: string;
    issuingDate?: string;
    certifyingDate?: string;
    place?: string;
  } | null;
  latestShipmentId: string | null;
  currentPreview: DocumentOutputSnapshot | null;
  previewWarnings: string[];
  unavailableReason: string | null;
  revisions: Array<{
    id: string;
    title: string;
    status: string;
    revisionNumber: number;
    generatedAt: string;
    isFinal: boolean;
  }>;
  documentRevisionCount: number;
};

export default function ContractDocumentFamilyPage({
  params,
}: {
  params: Promise<{ id: string; family: DocumentFamily }>;
}) {
  const router = useRouter();
  const { chooseTemplateLayout, pickerModal } = useTemplatePicker();
  const [contractId, setContractId] = useState("");
  const [family, setFamily] = useState<DocumentFamily>("commercial_invoice");
  const [payload, setPayload] = useState<FamilyPayload | null>(null);
  const [activeWayBillTab, setActiveWayBillTab] = useState(0);
  const [refNoInput, setRefNoInput] = useState("");
  const [savingRefNo, setSavingRefNo] = useState(false);
  const [savingIcoOverrides, setSavingIcoOverrides] = useState(false);
  const [refNoNotice, setRefNoNotice] = useState<string | null>(null);
  const [icoNotice, setIcoNotice] = useState<string | null>(null);
  const [icoOverrides, setIcoOverrides] = useState<Record<string, string>>({});
  const [showRevisionHistory, setShowRevisionHistory] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    Promise.resolve(params)
      .then(async ({ id, family }) => {
        if (!mounted) {
          return;
        }

        setContractId(id);
        setFamily(family);
        setRefNoNotice(null);
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

  useEffect(() => {
    if (!contractId) {
      return;
    }

    let mounted = true;

    apiClient<FamilyPayload>(
      `/api/contracts/${contractId}/document-family?orgId=${DEFAULT_ORG_ID}&family=${family}`,
    )
      .then((data) => {
        if (mounted) {
          setPayload(data);
          setRefNoInput(data.refNo ?? "");
          setIcoOverrides({
            exporterConsignor: data.icoOverrides?.exporterConsignor ?? "",
            notifyAddress: data.icoOverrides?.notifyAddress ?? "",
            internalReferenceNo: data.icoOverrides?.internalReferenceNo ?? "",
            countryCode: data.icoOverrides?.countryCode ?? "",
            portCode: data.icoOverrides?.portCode ?? "",
            serialNo: data.icoOverrides?.serialNo ?? "",
            producingCountry: data.icoOverrides?.producingCountry ?? "",
            countryDestination: data.icoOverrides?.countryDestination ?? "",
            dateOfExport: data.icoOverrides?.dateOfExport ?? "",
            countryTransShipment: data.icoOverrides?.countryTransShipment ?? "",
            nameOfCarrier: data.icoOverrides?.nameOfCarrier ?? "",
            icoIdentificationMark: data.icoOverrides?.icoIdentificationMark ?? "",
            otherMarksIcoNo: data.icoOverrides?.otherMarksIcoNo ?? "",
            otherMarksCertNo: data.icoOverrides?.otherMarksCertNo ?? "",
            descriptionOtherSpecify: data.icoOverrides?.descriptionOtherSpecify ?? "",
            partBText: data.icoOverrides?.partBText ?? "",
            issuingDate: data.icoOverrides?.issuingDate ?? "",
            certifyingDate: data.icoOverrides?.certifyingDate ?? "",
            place: data.icoOverrides?.place ?? "",
          });
          setError(null);
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
  }, [contractId, family]);

  async function saveRefNo() {
    if (!contractId) {
      return;
    }

    setSavingRefNo(true);
    setRefNoNotice(null);
    setError(null);

    try {
      const saved = await apiClient<{ family: DocumentFamily; refNo: string }>(
        `/api/contracts/${contractId}/document-family`,
        {
          method: "POST",
          body: JSON.stringify({
            orgId: DEFAULT_ORG_ID,
            family,
            refNo: refNoInput,
          }),
        },
      );

      setRefNoInput(saved.refNo);
      const refreshed = await apiClient<FamilyPayload>(
        `/api/contracts/${contractId}/document-family?orgId=${DEFAULT_ORG_ID}&family=${family}`,
      );
      setPayload(refreshed);
      setRefNoInput(refreshed.refNo ?? "");
      setRefNoNotice("Ref No saved.");
    } catch (saveError) {
      setError((saveError as Error).message);
    } finally {
      setSavingRefNo(false);
    }
  }

  async function generateRevision() {
    if (!contractId || !payload) {
      return;
    }

    setGenerating(true);
    setGenerateError(null);

    try {
      const templateLayout = await chooseTemplateLayout(payload.docType);

      const data = await apiClient<{ docId: string }>("/api/documents/generate", {
        method: "POST",
        body: JSON.stringify({
          orgId: DEFAULT_ORG_ID,
          contractId,
          shipmentId: payload.latestShipmentId ?? undefined,
          docType: payload.docType,
          templateVersion: "v1",
          templateLayout,
        }),
      });

      router.push(`/app/contracts/${encodeURIComponent(contractId)}/documents/generated/${data.docId}/review?family=${payload.family}`);
    } catch (generateRevisionError) {
      const message = (generateRevisionError as Error).message;
      if (message !== "Template selection cancelled.") {
        setGenerateError(message);
      }
    } finally {
      setGenerating(false);
    }
  }

  async function saveIcoOverrides() {
    if (!contractId) {
      return;
    }

    setSavingIcoOverrides(true);
    setIcoNotice(null);
    setError(null);

    try {
      await apiClient<{ family: DocumentFamily; refNo: string }>(
        `/api/contracts/${contractId}/document-family`,
        {
          method: "POST",
          body: JSON.stringify({
            orgId: DEFAULT_ORG_ID,
            family,
            refNo: refNoInput,
            icoOverrides,
          }),
        },
      );

      const refreshed = await apiClient<FamilyPayload>(
        `/api/contracts/${contractId}/document-family?orgId=${DEFAULT_ORG_ID}&family=${family}`,
      );
      setPayload(refreshed);
      setIcoNotice("ICO inputs saved.");
    } catch (saveError) {
      setError((saveError as Error).message);
    } finally {
      setSavingIcoOverrides(false);
    }
  }

  if (error) {
    return <section className="card"><p className="error-text">{error}</p></section>;
  }

  if (!payload) {
    return (
      <section className="card">
        <CenteredLoader label="Loading document..." />
      </section>
    );
  }

  const wayBillSections = payload.currentPreview?.sections.filter((section) => section.heading.startsWith("Driver ")) ?? [];
  const safeWayBillTabIndex = activeWayBillTab < wayBillSections.length ? activeWayBillTab : 0;
  const activeWayBillSection = wayBillSections[safeWayBillTabIndex];
  const latestRevision = payload.revisions[0];

  return (
    <section className="page-shell document-workspace">
      {pickerModal}
      <header className="page-header">
        <h1>{payload.familyLabel}</h1>
        <p>Current preview is rebuilt from the latest resolved contract state. Each generation creates a new immutable revision.</p>
      </header>

      <div className="document-toolbar">
        {latestRevision ? (
          <Link href={`/app/contracts/${contractId}/documents/generated/${latestRevision.id}/review?family=${payload.family}`}>
            <button type="button" className="button-secondary">View Latest</button>
          </Link>
        ) : null}
        <button
          type="button"
          onClick={() => void generateRevision()}
          disabled={generating || Boolean(payload.unavailableReason)}
        >
          {generating ? "Generating..." : `Generate ${payload.familyLabel}`}
        </button>
        <button type="button" className="button-secondary" onClick={() => setShowRevisionHistory(true)}>
          Revision History
        </button>
      </div>
      {generateError ? <p className="error-text">{generateError}</p> : null}

      <FormSection
        title="Current Preview"
        description="Latest draft preview based on current resolved data."
        actions={(
          <span className="source-badge source-lc">{payload.documentRevisionCount} total rev</span>
        )}
      >
        <div className="document-refno-row">
          <label>
            <span>Ref No</span>
            <input
              value={refNoInput}
              onChange={(event) => setRefNoInput(event.target.value)}
              placeholder="Enter document reference"
            />
          </label>
          <button type="button" onClick={() => void saveRefNo()} disabled={savingRefNo}>
            {savingRefNo ? "Saving..." : "Save"}
          </button>
        </div>
        {refNoNotice ? <p className="muted-text">{refNoNotice}</p> : null}

        {payload.family === "ico_certificate" ? (
          <>
            <h3>ICO Manual Inputs</h3>
            <p className="sidebar-subtitle">Grouped manual entries for fields like 1, 6, 8 and related boxes. Save once for all changes.</p>
            <div className="form-grid span-all">
              {([
                ["exporterConsignor", "1 Exporter/Consignor", "col-12"],
                ["notifyAddress", "2 Notify address", "col-12"],
                ["internalReferenceNo", "3 Internal reference No", "col-4"],
                ["countryCode", "4 Country code", "col-2"],
                ["portCode", "4 Port code", "col-2"],
                ["serialNo", "4 Serial No", "col-4"],
                ["producingCountry", "5 Producing country", "col-4"],
                ["countryDestination", "6 Country of destination", "col-4"],
                ["dateOfExport", "7 Date of export", "col-3"],
                ["countryTransShipment", "8 Country of trans-shipment", "col-4"],
                ["nameOfCarrier", "9 Name of carrier", "col-6"],
                ["icoIdentificationMark", "10 ICO Identification mark", "col-6"],
                ["otherMarksIcoNo", "10 Other marks: ICO No", "col-3"],
                ["otherMarksCertNo", "10 Other marks: Cert No", "col-3"],
                ["descriptionOtherSpecify", "14 Other (specify)", "col-12"],
                ["partBText", "17 Part B text", "col-12"],
                ["issuingDate", "16 Issuing date", "col-3"],
                ["certifyingDate", "16 Certifying date", "col-3"],
                ["place", "16 Place", "col-6"],
              ] as const).map(([key, label, colClass]) => (
                <label key={key} className={colClass}>
                  <span>{label}</span>
                  <textarea
                    value={icoOverrides[key] ?? ""}
                    onChange={(event) => setIcoOverrides((current) => ({ ...current, [key]: event.target.value }))}
                    rows={key === "partBText" || key === "descriptionOtherSpecify" ? 3 : 2}
                  />
                </label>
              ))}
            </div>
            <div className="document-workflow-actions">
              <button type="button" onClick={() => void saveIcoOverrides()} disabled={savingIcoOverrides}>
                {savingIcoOverrides ? "Saving ICO Inputs..." : "Save ICO Inputs"}
              </button>
            </div>
            {icoNotice ? <p className="muted-text">{icoNotice}</p> : null}
          </>
        ) : null}

        {payload.unavailableReason ? (
          <p>{payload.unavailableReason}</p>
        ) : payload.currentPreview ? (
          <div className="document-preview-panel span-all">
            {payload.previewWarnings.length > 0 ? (
              <div className="document-preview-warnings">
                <strong>Warnings</strong>
                <ul className="document-preview-warnings__list">
                  {payload.previewWarnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {payload.docType === "way_bill" && wayBillSections.length > 0 ? (
              <>
                <div className="document-preview-tabs" role="tablist" aria-label="Way bill drivers">
                  {wayBillSections.map((section, index) => (
                    <button
                      key={section.heading}
                      type="button"
                      role="tab"
                      aria-selected={index === safeWayBillTabIndex}
                      className={index === safeWayBillTabIndex ? "document-preview-tabs__tab is-active" : "document-preview-tabs__tab"}
                      onClick={() => setActiveWayBillTab(index)}
                    >
                      {section.heading.replace(/^Driver\s+\d+\s+-\s+/, "")}
                    </button>
                  ))}
                </div>

                {activeWayBillSection ? (
                  <DocumentPreviewBlock
                    heading={activeWayBillSection.heading}
                    rows={activeWayBillSection.rows}
                  />
                ) : null}
              </>
            ) : (
              <div className="document-preview-stack">
                {payload.currentPreview.sections.map((section) => (
                  <DocumentPreviewBlock
                    key={section.heading}
                    heading={section.heading}
                    rows={section.rows}
                  />
                ))}
              </div>
            )}
          </div>
        ) : null}
      </FormSection>

      <RevisionHistoryModal
        open={showRevisionHistory}
        onClose={() => setShowRevisionHistory(false)}
        revisions={payload.revisions}
        contractId={contractId}
        family={payload.family}
      />
    </section>
  );
}

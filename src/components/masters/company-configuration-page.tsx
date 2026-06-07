"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiClient } from "@/lib/api/client";
import { DEFAULT_ORG_ID } from "@/lib/config";
import { CenteredLoader } from "@/components/ui/centered-loader";
import { useToast } from "@/components/ui/toast";
import { useUnsavedChangesGuard } from "@/components/ui/use-unsaved-changes-guard";
import type {
  BeneficiaryBankProfile,
  CompanyConfiguration,
  DocumentBrandingSettings,
  DocumentType,
  PackagingDefinition,
} from "@/types/models";

type CompanyConfigurationFormState = {
  sellerName: string;
  sellerAddress: string;
  sellerAmharicName: string;
  companyEmail: string;
  companyPhone: string;
  defaultOrigin: string;
  defaultHsCode: string;
  icoReferencePrefix: string;
  placeOfIssue: string;
  transitorCompanyName: string;
  transitorPhoneNumber: string;
  transitorLocation: string;
  currencies: string[];
  paymentTerms: string[];
  deliveryTerms: string[];
  priceUoms: string[];
  packagingUnits: string[];
  documentBranding: DocumentBrandingSettings;
  bulkReferenceKg: string;
  packagingDefinitions: PackagingDefinition[];
  beneficiaryBanks: BeneficiaryBankProfile[];
};

const documentTypeLabels: Record<DocumentType, string> = {
  invoice: "Commercial Invoice (ICC)",
  packing_list: "Packing List (ICC)",
  shipping_instructions: "Shipping Instruction",
  quality_certificate: "Certificate of Quality",
  weight_certificate: "Certificate of Weight",
  way_bill: "Way Bill",
  ico_certificate: "ICO Certificate of Origin",
  bill_of_lading: "Bill of Lading (MSC)",
};

function toFormState(configuration: CompanyConfiguration): CompanyConfigurationFormState {
  const currencies = (configuration.currencies ?? []).filter((entry) => entry.trim().length > 0);
  const packagingUnits = (configuration.packagingUnits ?? []).filter((entry) => entry.trim().length > 0);

  return {
    sellerName: configuration.sellerName,
    sellerAddress: configuration.sellerAddress,
    sellerAmharicName: configuration.sellerAmharicName ?? "",
    companyEmail: configuration.companyEmail ?? "",
    companyPhone: configuration.companyPhone ?? "",
    defaultOrigin: configuration.defaultOrigin,
    defaultHsCode: configuration.defaultHsCode,
    icoReferencePrefix: configuration.icoReferencePrefix,
    placeOfIssue: configuration.placeOfIssue,
    transitorCompanyName: configuration.transitorCompanyName ?? "",
    transitorPhoneNumber: configuration.transitorPhoneNumber ?? "",
    transitorLocation: configuration.transitorLocation ?? "",
    currencies: currencies.length > 0 ? currencies : ["USD"],
    paymentTerms: configuration.paymentTerms,
    deliveryTerms: configuration.deliveryTerms,
    priceUoms: configuration.priceUoms,
    packagingUnits: packagingUnits.length > 0 ? packagingUnits : ["Bag of 60Kg"],
    documentBranding: configuration.documentBranding,
    bulkReferenceKg: String(configuration.bulkReferenceKg),
    packagingDefinitions: configuration.packagingDefinitions,
    beneficiaryBanks: configuration.beneficiaryBanks ?? [],
  };
}

async function toOptimizedDataUrl(file: File): Promise<string> {
  const source = await new Promise<HTMLImageElement>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Unable to read image."));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error("Unable to read file."));
    reader.readAsDataURL(file);
  });

  const maxWidth = 2400;
  const maxHeight = 1000;
  const scale = Math.min(maxWidth / source.width, maxHeight / source.height, 1);
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Unable to process image.");
  }

  context.drawImage(source, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", 0.88);
}

export function CompanyConfigurationPage() {
  const toast = useToast();
  const [form, setForm] = useState<CompanyConfigurationFormState | null>(null);
  const [activeTab, setActiveTab] = useState<"general" | "banking" | "branding">("general");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const initialSnapshot = useRef<string>("");
  const initialSnapshotForm = useRef<CompanyConfigurationFormState | null>(null);
  const [highlightDirty, setHighlightDirty] = useState(false);

  const isDirty = useMemo(() => {
    if (!form) {
      return false;
    }
    return JSON.stringify(form) !== initialSnapshot.current;
  }, [form]);

  useUnsavedChangesGuard({ enabled: isDirty && !saving, onBlockedNavigation: () => setHighlightDirty(true) });

  const isFieldDirty = useCallback(
    <Key extends keyof CompanyConfigurationFormState>(key: Key) => {
      const snapshot = initialSnapshotForm.current;
      if (!form || !snapshot) {
        return false;
      }
      return JSON.stringify(form[key]) !== JSON.stringify(snapshot[key]);
    },
    [form],
  );
  const dirtyControlClass = useCallback(
    <Key extends keyof CompanyConfigurationFormState>(key: Key) => (highlightDirty && isFieldDirty(key) ? "field-error-control" : undefined),
    [highlightDirty, isFieldDirty],
  );

  function discardChanges() {
    if (!initialSnapshotForm.current) {
      return;
    }
    setForm(initialSnapshotForm.current);
    setAttemptedSubmit(false);
    setHighlightDirty(false);
    toast.info("Discarded unsaved changes.");
  }

  function requiredLabelClass(isMissing: boolean) {
    return isMissing ? "is-required field-error" : "is-required";
  }

  async function loadConfiguration() {
    setLoading(true);
    setError(null);

    try {
      const data = await apiClient<CompanyConfiguration>(`/api/company-configuration?orgId=${DEFAULT_ORG_ID}`);
      const nextForm = toFormState(data);
      setForm(nextForm);
      initialSnapshot.current = JSON.stringify(nextForm);
      initialSnapshotForm.current = nextForm;
      setAttemptedSubmit(false);
      setHighlightDirty(false);
      setSavedAt(data.updatedAt.startsWith("1970-01-01") ? null : data.updatedAt);
    } catch (loadError) {
      setError((loadError as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadConfiguration();
  }, []);

  function updateField<Key extends keyof CompanyConfigurationFormState>(
    key: Key,
    value: CompanyConfigurationFormState[Key],
  ) {
    setForm((current) => current ? { ...current, [key]: value } : current);
  }

  function updatePackagingDefinition(
    index: number,
    key: keyof PackagingDefinition,
    value: string,
  ) {
    setForm((current) => {
      if (!current) {
        return current;
      }

      const nextDefinitions = current.packagingDefinitions.map((definition, definitionIndex) => {
        if (definitionIndex !== index) {
          return definition;
        }

        if (key === "label" || key === "uom") {
          return {
            ...definition,
            [key]: value,
          };
        }

        return {
          ...definition,
          [key]: Number(value),
        };
      });

      return {
        ...current,
        packagingDefinitions: nextDefinitions,
      };
    });
  }

  function updatePaymentTerm(index: number, value: string) {
    setForm((current) => {
      if (!current) {
        return current;
      }

      const nextTerms = current.paymentTerms.map((term, termIndex) => {
        if (termIndex !== index) {
          return term;
        }
        return value;
      });

      return {
        ...current,
        paymentTerms: nextTerms,
      };
    });
  }

  function addPaymentTerm() {
    setForm((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        paymentTerms: [...current.paymentTerms, ""],
      };
    });
  }

  function removePaymentTerm(index: number) {
    setForm((current) => {
      if (!current || current.paymentTerms.length <= 1) {
        return current;
      }

      return {
        ...current,
        paymentTerms: current.paymentTerms.filter((_, termIndex) => termIndex !== index),
      };
    });
  }

  function updateDeliveryTerm(index: number, value: string) {
    setForm((current) => {
      if (!current) {
        return current;
      }

      const nextTerms = current.deliveryTerms.map((term, termIndex) => {
        if (termIndex !== index) {
          return term;
        }
        return value;
      });

      return {
        ...current,
        deliveryTerms: nextTerms,
      };
    });
  }

  function addDeliveryTerm() {
    setForm((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        deliveryTerms: [...current.deliveryTerms, ""],
      };
    });
  }

  function removeDeliveryTerm(index: number) {
    setForm((current) => {
      if (!current || current.deliveryTerms.length <= 1) {
        return current;
      }

      return {
        ...current,
        deliveryTerms: current.deliveryTerms.filter((_, termIndex) => termIndex !== index),
      };
    });
  }

  function updatePriceUom(index: number, value: string) {
    setForm((current) => {
      if (!current) {
        return current;
      }

      const nextTerms = current.priceUoms.map((term, termIndex) => {
        if (termIndex !== index) {
          return term;
        }
        return value;
      });

      return {
        ...current,
        priceUoms: nextTerms,
      };
    });
  }

  function addPriceUom() {
    setForm((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        priceUoms: [...current.priceUoms, ""],
      };
    });
  }

  function addBeneficiaryBank() {
    setForm((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        beneficiaryBanks: [
          ...current.beneficiaryBanks,
          { beneficiaryBank: "", beneficiaryBankAddress: "", swiftNumber: "", beneficiaryAccountNumbers: [""] },
        ],
      };
    });
  }

  function updateBeneficiaryBankName(index: number, value: string) {
    setForm((current) => {
      if (!current) {
        return current;
      }

      const nextBanks = current.beneficiaryBanks.map((bank, bankIndex) => (
        bankIndex === index ? { ...bank, beneficiaryBank: value } : bank
      ));

      return {
        ...current,
        beneficiaryBanks: nextBanks,
      };
    });
  }

  function updateBeneficiaryBankAddress(index: number, value: string) {
    setForm((current) => {
      if (!current) {
        return current;
      }

      const nextBanks = current.beneficiaryBanks.map((bank, bankIndex) => (
        bankIndex === index ? { ...bank, beneficiaryBankAddress: value } : bank
      ));

      return {
        ...current,
        beneficiaryBanks: nextBanks,
      };
    });
  }

  function updateBeneficiarySwiftNumber(index: number, value: string) {
    setForm((current) => {
      if (!current) {
        return current;
      }

      const nextBanks = current.beneficiaryBanks.map((bank, bankIndex) => (
        bankIndex === index ? { ...bank, swiftNumber: value } : bank
      ));

      return {
        ...current,
        beneficiaryBanks: nextBanks,
      };
    });
  }

  function removeBeneficiaryBank(index: number) {
    setForm((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        beneficiaryBanks: current.beneficiaryBanks.filter((_, bankIndex) => bankIndex !== index),
      };
    });
  }

  function addBeneficiaryAccount(bankIndex: number) {
    setForm((current) => {
      if (!current) {
        return current;
      }

      const nextBanks = current.beneficiaryBanks.map((bank, index) => {
        if (index !== bankIndex) {
          return bank;
        }

        return {
          ...bank,
          beneficiaryAccountNumbers: [...bank.beneficiaryAccountNumbers, ""],
        };
      });

      return {
        ...current,
        beneficiaryBanks: nextBanks,
      };
    });
  }

  function updateBeneficiaryAccount(bankIndex: number, accountIndex: number, value: string) {
    setForm((current) => {
      if (!current) {
        return current;
      }

      const nextBanks = current.beneficiaryBanks.map((bank, index) => {
        if (index !== bankIndex) {
          return bank;
        }

        const nextAccounts = bank.beneficiaryAccountNumbers.map((account, idx) => (
          idx === accountIndex ? value : account
        ));

        return {
          ...bank,
          beneficiaryAccountNumbers: nextAccounts,
        };
      });

      return {
        ...current,
        beneficiaryBanks: nextBanks,
      };
    });
  }

  function removeBeneficiaryAccount(bankIndex: number, accountIndex: number) {
    setForm((current) => {
      if (!current) {
        return current;
      }

      const nextBanks = current.beneficiaryBanks.map((bank, index) => {
        if (index !== bankIndex) {
          return bank;
        }

        if (bank.beneficiaryAccountNumbers.length <= 1) {
          return bank;
        }

        return {
          ...bank,
          beneficiaryAccountNumbers: bank.beneficiaryAccountNumbers.filter((_, idx) => idx !== accountIndex),
        };
      });

      return {
        ...current,
        beneficiaryBanks: nextBanks,
      };
    });
  }

  function removePriceUom(index: number) {
    setForm((current) => {
      if (!current || current.priceUoms.length <= 1) {
        return current;
      }

      return {
        ...current,
        priceUoms: current.priceUoms.filter((_, termIndex) => termIndex !== index),
      };
    });
  }

  function updateCurrency(index: number, value: string) {
    setForm((current) => {
      if (!current) {
        return current;
      }

      const nextCurrencies = current.currencies.map((currency, currencyIndex) => (
        currencyIndex === index ? value : currency
      ));

      return {
        ...current,
        currencies: nextCurrencies,
      };
    });
  }

  function addCurrency() {
    setForm((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        currencies: [...current.currencies, ""],
      };
    });
  }

  function removeCurrency(index: number) {
    setForm((current) => {
      if (!current || current.currencies.length <= 1) {
        return current;
      }

      return {
        ...current,
        currencies: current.currencies.filter((_, currencyIndex) => currencyIndex !== index),
      };
    });
  }

  function updatePackagingUnit(index: number, value: string) {
    setForm((current) => {
      if (!current) {
        return current;
      }

      const nextUnits = current.packagingUnits.map((unit, unitIndex) => (
        unitIndex === index ? value : unit
      ));

      return {
        ...current,
        packagingUnits: nextUnits,
      };
    });
  }

  function addPackagingUnit() {
    setForm((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        packagingUnits: [...current.packagingUnits, ""],
      };
    });
  }

  function removePackagingUnit(index: number) {
    setForm((current) => {
      if (!current || current.packagingUnits.length <= 1) {
        return current;
      }

      return {
        ...current,
        packagingUnits: current.packagingUnits.filter((_, unitIndex) => unitIndex !== index),
      };
    });
  }

  function updateBrandingSlot(
    slot: "header" | "footer",
    key: "heightMm" | "fit" | "positionXPercent" | "positionYPercent" | "imageDataUrl",
    value: number | string | undefined,
  ) {
    setForm((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        documentBranding: {
          ...current.documentBranding,
          [slot]: {
            ...current.documentBranding[slot],
            [key]: value,
          },
        },
      };
    });
  }

  function updateBrandingToggle(docType: DocumentType, slot: "header" | "footer", checked: boolean) {
    setForm((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        documentBranding: {
          ...current.documentBranding,
          applyByDocType: {
            ...current.documentBranding.applyByDocType,
            [docType]: {
              ...current.documentBranding.applyByDocType[docType],
              [slot]: checked,
            },
          },
        },
      };
    });
  }

  async function handleBrandingImageUpload(slot: "header" | "footer", fileList: FileList | null) {
    const file = fileList?.item(0);
    if (!file) {
      return;
    }

    try {
      const dataUrl = await toOptimizedDataUrl(file);
      updateBrandingSlot(slot, "imageDataUrl", dataUrl);
    } catch (uploadError) {
      setError((uploadError as Error).message);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form) {
      return;
    }

    setAttemptedSubmit(true);
    const bulkReferenceKg = Number(form.bulkReferenceKg);
    const missingRequired =
      form.sellerName.trim().length === 0
      || form.sellerAddress.trim().length === 0
      || form.defaultOrigin.trim().length === 0
      || form.defaultHsCode.trim().length === 0
      || form.icoReferencePrefix.trim().length === 0
      || form.placeOfIssue.trim().length === 0
      || !Number.isFinite(bulkReferenceKg)
      || bulkReferenceKg <= 0
      || form.packagingDefinitions.some((definition) => (
        definition.label.trim().length === 0
        || definition.uom.trim().length === 0
        || !Number.isFinite(definition.netWeightKg)
        || definition.netWeightKg <= 0
        || !Number.isFinite(definition.tareWeightKg)
        || definition.tareWeightKg <= 0
        || !Number.isFinite(definition.grossWeightKg)
        || definition.grossWeightKg <= 0
      ));

    if (missingRequired) {
      toast.error("Fill in the required fields.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await apiClient<{ saved: boolean }>("/api/company-configuration", {
        method: "POST",
        body: JSON.stringify({
          orgId: DEFAULT_ORG_ID,
          companyConfiguration: {
            ...form,
            bulkReferenceKg,
          },
        }),
      });

      await loadConfiguration();
      toast.success("Company configuration saved.");
    } catch (submitError) {
      setError((submitError as Error).message);
      toast.error("Unable to save company configuration.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="page-shell">
        <section className="card">
          <CenteredLoader label="Loading organization defaults..." />
        </section>
      </section>
    );
  }

  if (!form) {
    return (
      <section className="page-shell">
        <section className="card">
          <p className="error-text">{error ?? "Unable to load organization defaults."}</p>
        </section>
      </section>
    );
  }

  return (
    <section className="page-shell">
      <header className="page-header">
        <h1>Company Configuration</h1>
        <p>
          Organization-level defaults used across contracts and generated documents.
        </p>
      </header>

      <form className="card form-grid" onSubmit={handleSubmit} noValidate>
        <div className="section-heading span-all">
          <div>
            <h3>
              {activeTab === "general"
                ? "General Configuration"
                : activeTab === "banking"
                  ? "Banking Configuration"
                  : "Document Branding"}
            </h3>
            <p className="sidebar-subtitle">
              {activeTab === "general"
                ? "Master company constants used throughout contract and document generation."
                : activeTab === "banking"
                  ? "Default beneficiary bank + account options used in contract Bank & LC forms."
                  : "A4-safe header and footer graphics for generated documents."}
            </p>
          </div>
          <div className="row-actions">
            <button type="button" className="button-secondary" onClick={() => void loadConfiguration()} disabled={loading || saving}>
              Refresh
            </button>
            <button type="button" className="button-secondary" onClick={discardChanges} disabled={!isDirty || saving}>
              Discard changes
            </button>
            <button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Configuration"}
            </button>
          </div>
        </div>

        <div className="span-all config-tabs" role="tablist" aria-label="Company configuration tabs">
          <button
            type="button"
            className={activeTab === "general" ? "" : "button-secondary"}
            onClick={() => setActiveTab("general")}
          >
            General
          </button>
          <button
            type="button"
            className={activeTab === "branding" ? "" : "button-secondary"}
            onClick={() => setActiveTab("branding")}
          >
            Document Branding
          </button>
          <button
            type="button"
            className={activeTab === "banking" ? "" : "button-secondary"}
            onClick={() => setActiveTab("banking")}
          >
            Banking
          </button>
        </div>

        {activeTab === "general" ? (
          <>
            <label className={requiredLabelClass(attemptedSubmit && form.sellerName.trim().length === 0)}>
              <span className="label-text">Seller Name</span>
              <input className={dirtyControlClass("sellerName")} value={form.sellerName} onChange={(event) => updateField("sellerName", event.target.value)} required />
            </label>
            <label>
              Company Email
              <input className={dirtyControlClass("companyEmail")} type="email" value={form.companyEmail} onChange={(event) => updateField("companyEmail", event.target.value)} />
            </label>
            <label className={`span-all ${requiredLabelClass(attemptedSubmit && form.sellerAddress.trim().length === 0)}`}>
              <span className="label-text">Seller Address</span>
              <textarea className={dirtyControlClass("sellerAddress")} rows={3} value={form.sellerAddress} onChange={(event) => updateField("sellerAddress", event.target.value)} required />
            </label>
            <label className="span-all">
              Amharic Name
              <input className={dirtyControlClass("sellerAmharicName")} value={form.sellerAmharicName} onChange={(event) => updateField("sellerAmharicName", event.target.value)} />
            </label>
            <label>
              Company Phone
              <input className={dirtyControlClass("companyPhone")} value={form.companyPhone} onChange={(event) => updateField("companyPhone", event.target.value)} />
            </label>

            <div className="section-heading span-all mt-sm">
              <div>
                <h3>Export Defaults</h3>
                <p className="sidebar-subtitle">Origin, HS code, ICO prefix, and issue location referenced by templates.</p>
              </div>
            </div>

            <label className={requiredLabelClass(attemptedSubmit && form.defaultOrigin.trim().length === 0)}>
              <span className="label-text">Default Origin</span>
              <input className={dirtyControlClass("defaultOrigin")} value={form.defaultOrigin} onChange={(event) => updateField("defaultOrigin", event.target.value)} required />
            </label>
            <label className={requiredLabelClass(attemptedSubmit && form.defaultHsCode.trim().length === 0)}>
              <span className="label-text">Default HS Code</span>
              <input className={dirtyControlClass("defaultHsCode")} value={form.defaultHsCode} onChange={(event) => updateField("defaultHsCode", event.target.value)} required />
            </label>
            <label className={requiredLabelClass(attemptedSubmit && form.icoReferencePrefix.trim().length === 0)}>
              <span className="label-text">ICO Reference Prefix</span>
              <input className={dirtyControlClass("icoReferencePrefix")} value={form.icoReferencePrefix} onChange={(event) => updateField("icoReferencePrefix", event.target.value)} required />
            </label>
            <label className={requiredLabelClass(attemptedSubmit && form.placeOfIssue.trim().length === 0)}>
              <span className="label-text">Place of Issue</span>
              <input className={dirtyControlClass("placeOfIssue")} value={form.placeOfIssue} onChange={(event) => updateField("placeOfIssue", event.target.value)} required />
            </label>
            <label
              className={requiredLabelClass(attemptedSubmit && (!Number.isFinite(Number(form.bulkReferenceKg)) || Number(form.bulkReferenceKg) <= 0))}
            >
              <span className="label-text">Bulk Reference Kg</span>
              <input
                className={dirtyControlClass("bulkReferenceKg")}
                type="number"
                min="0.001"
                step="0.001"
                value={form.bulkReferenceKg}
                onChange={(event) => updateField("bulkReferenceKg", event.target.value)}
                required
              />
            </label>

            <div className="section-heading span-all mt-sm">
              <div>
                <h3>Payment, Delivery, and Price Terms</h3>
                <p className="sidebar-subtitle">Maintain selectable options used in contract creation.</p>
              </div>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: "72px" }}>#</th>
                    <th>Payment Term</th>
                    <th style={{ width: "130px" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {form.paymentTerms.map((term, index) => (
                    <tr key={`payment-term-${index + 1}`}>
                      <td>{index + 1}</td>
                      <td>
                        <input
                          className={dirtyControlClass("paymentTerms")}
                          value={term}
                          onChange={(event) => updatePaymentTerm(index, event.target.value)}
                          required
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="button-secondary"
                          onClick={() => removePaymentTerm(index)}
                          disabled={form.paymentTerms.length <= 1}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="row-actions mt-sm">
                <button type="button" className="button-secondary" onClick={addPaymentTerm}>
                  Add Payment Term
                </button>
              </div>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: "72px" }}>#</th>
                    <th>Delivery Term</th>
                    <th style={{ width: "130px" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {form.deliveryTerms.map((term, index) => (
                    <tr key={`delivery-term-${index + 1}`}>
                      <td>{index + 1}</td>
                      <td>
                        <input
                          className={dirtyControlClass("deliveryTerms")}
                          value={term}
                          onChange={(event) => updateDeliveryTerm(index, event.target.value)}
                          required
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="button-secondary"
                          onClick={() => removeDeliveryTerm(index)}
                          disabled={form.deliveryTerms.length <= 1}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="row-actions mt-sm">
                <button type="button" className="button-secondary" onClick={addDeliveryTerm}>
                  Add Delivery Term
                </button>
              </div>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: "72px" }}>#</th>
                    <th>Price UoM</th>
                    <th style={{ width: "130px" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {form.priceUoms.map((uom, index) => (
                    <tr key={`price-uom-${index + 1}`}>
                      <td>{index + 1}</td>
                      <td>
                        <input
                          className={dirtyControlClass("priceUoms")}
                          value={uom}
                          onChange={(event) => updatePriceUom(index, event.target.value)}
                          required
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="button-secondary"
                          onClick={() => removePriceUom(index)}
                          disabled={form.priceUoms.length <= 1}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="row-actions mt-sm">
                <button type="button" className="button-secondary" onClick={addPriceUom}>
                  Add Price UoM
                </button>
              </div>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: "72px" }}>#</th>
                    <th>Currency</th>
                    <th style={{ width: "130px" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {form.currencies.map((currency, index) => (
                    <tr key={`currency-${index + 1}`}>
                      <td>{index + 1}</td>
                      <td>
                        <input
                          className={dirtyControlClass("currencies")}
                          value={currency}
                          onChange={(event) => updateCurrency(index, event.target.value)}
                          required
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="button-secondary"
                          onClick={() => removeCurrency(index)}
                          disabled={form.currencies.length <= 1}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="row-actions mt-sm">
                <button type="button" className="button-secondary" onClick={addCurrency}>
                  Add Currency
                </button>
              </div>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: "72px" }}>#</th>
                    <th>Packaging</th>
                    <th style={{ width: "130px" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {form.packagingUnits.map((unit, index) => (
                    <tr key={`packaging-${index + 1}`}>
                      <td>{index + 1}</td>
                      <td>
                        <input
                          className={dirtyControlClass("packagingUnits")}
                          value={unit}
                          onChange={(event) => updatePackagingUnit(index, event.target.value)}
                          required
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="button-secondary"
                          onClick={() => removePackagingUnit(index)}
                          disabled={form.packagingUnits.length <= 1}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="row-actions mt-sm">
                <button type="button" className="button-secondary" onClick={addPackagingUnit}>
                  Add Packaging
                </button>
              </div>
            </div>

            <div className="section-heading span-all mt-sm">
              <div>
                <h3>Transitor</h3>
                <p className="sidebar-subtitle">Transit partner details used in shipping-related documents.</p>
              </div>
            </div>
            <label className="span-all">
              Transitor Company Name
              <input className={dirtyControlClass("transitorCompanyName")} value={form.transitorCompanyName} onChange={(event) => updateField("transitorCompanyName", event.target.value)} />
            </label>
            <label>
              Transitor Phone Number
              <input className={dirtyControlClass("transitorPhoneNumber")} value={form.transitorPhoneNumber} onChange={(event) => updateField("transitorPhoneNumber", event.target.value)} />
            </label>
            <label>
              Transitor Location
              <input className={dirtyControlClass("transitorLocation")} value={form.transitorLocation} onChange={(event) => updateField("transitorLocation", event.target.value)} />
            </label>

            <div className="section-heading span-all mt-sm">
              <div>
                <h3>Packaging Definitions</h3>
                <p className="sidebar-subtitle">Bag weight and tare settings used in document totals.</p>
              </div>
            </div>

            <div className="span-all table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Label</th>
                    <th>UoM</th>
                    <th>Net Weight Kg</th>
                    <th>Tare Weight Kg</th>
                    <th>Gross Weight Kg</th>
                  </tr>
                </thead>
                <tbody>
                  {form.packagingDefinitions.map((definition, index) => (
                    <tr key={index}>
                      <td>
                        <input
                          className={attemptedSubmit && definition.label.trim().length === 0 ? "field-error-control" : dirtyControlClass("packagingDefinitions")}
                          value={definition.label}
                          onChange={(event) => updatePackagingDefinition(index, "label", event.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          className={attemptedSubmit && definition.uom.trim().length === 0 ? "field-error-control" : dirtyControlClass("packagingDefinitions")}
                          value={definition.uom}
                          onChange={(event) => updatePackagingDefinition(index, "uom", event.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.001"
                          className={attemptedSubmit && (!Number.isFinite(definition.netWeightKg) || definition.netWeightKg <= 0)
                            ? "field-error-control"
                            : undefined}
                          value={definition.netWeightKg}
                          onChange={(event) => updatePackagingDefinition(index, "netWeightKg", event.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.001"
                          className={attemptedSubmit && (!Number.isFinite(definition.tareWeightKg) || definition.tareWeightKg <= 0)
                            ? "field-error-control"
                            : undefined}
                          value={definition.tareWeightKg}
                          onChange={(event) => updatePackagingDefinition(index, "tareWeightKg", event.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.001"
                          className={attemptedSubmit && (!Number.isFinite(definition.grossWeightKg) || definition.grossWeightKg <= 0)
                            ? "field-error-control"
                            : undefined}
                          value={definition.grossWeightKg}
                          onChange={(event) => updatePackagingDefinition(index, "grossWeightKg", event.target.value)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : activeTab === "banking" ? (
          <>
            <div className="section-heading span-all">
              <div>
                <h3>Beneficiary Banks</h3>
                <p className="sidebar-subtitle">
                  Add the beneficiary banks and account numbers you reuse across contracts.
                </p>
              </div>
              <div className="row-actions">
                <button type="button" className="button-secondary" onClick={addBeneficiaryBank}>
                  Add Bank
                </button>
              </div>
            </div>

            {form.beneficiaryBanks.length === 0 ? (
              <p className="span-all muted-text">No beneficiary banks configured yet.</p>
            ) : null}

            {form.beneficiaryBanks.map((bank, bankIndex) => (
              <section key={bankIndex} className="card span-all">
                <div className="row-actions" style={{ justifyContent: "space-between" }}>
                  <strong>Bank {bankIndex + 1}</strong>
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={() => removeBeneficiaryBank(bankIndex)}
                  >
                    Remove Bank
                  </button>
                </div>

                <div className="form-grid mt-sm">
                  <label className="span-all">
                    Beneficiary Bank
                    <input
                      value={bank.beneficiaryBank}
                      onChange={(event) => updateBeneficiaryBankName(bankIndex, event.target.value)}
                      placeholder="e.g. Commercial Bank of Ethiopia"
                    />
                  </label>

                  <label className="span-all">
                    Address of Bank
                    <input
                      value={bank.beneficiaryBankAddress ?? ""}
                      onChange={(event) => updateBeneficiaryBankAddress(bankIndex, event.target.value)}
                      placeholder="e.g. Addis Ababa, Ethiopia"
                    />
                  </label>

                  <label className="span-all">
                    SWIFT Number
                    <input
                      value={bank.swiftNumber ?? ""}
                      onChange={(event) => updateBeneficiarySwiftNumber(bankIndex, event.target.value)}
                      placeholder="e.g. CBETETAA"
                    />
                  </label>

                  <div className="span-all section-heading mt-sm">
                    <div>
                      <h3>Beneficiary Account Numbers</h3>
                      <p className="sidebar-subtitle">Shown after selecting this bank in Bank &amp; LC forms.</p>
                    </div>
                    <div className="row-actions">
                      <button
                        type="button"
                        className="button-secondary"
                        onClick={() => addBeneficiaryAccount(bankIndex)}
                      >
                        Add Account
                      </button>
                    </div>
                  </div>

                  {bank.beneficiaryAccountNumbers.map((account, accountIndex) => (
                    <label key={`${bankIndex}-${accountIndex}`}>
                      Account No {accountIndex + 1}
                      <input
                        value={account}
                        onChange={(event) => updateBeneficiaryAccount(bankIndex, accountIndex, event.target.value)}
                        placeholder="e.g. 1000123456789"
                      />
                      {bank.beneficiaryAccountNumbers.length > 1 ? (
                        <button
                          type="button"
                          className="button-secondary mt-sm"
                          onClick={() => removeBeneficiaryAccount(bankIndex, accountIndex)}
                        >
                          Remove
                        </button>
                      ) : null}
                    </label>
                  ))}
                </div>
              </section>
            ))}
          </>
        ) : (
          <>
            <div className="span-all branding-note">
              <p>
                Upload optional header/footer images sized for A4 documents. You can apply each slot per document type.
                Cropping is controlled by <strong>Fit</strong> and <strong>Position</strong>.
              </p>
            </div>

            {(["header", "footer"] as const).map((slot) => {
              const settings = form.documentBranding[slot];
              const label = slot === "header" ? "Header" : "Footer";

              return (
                <section key={slot} className="span-all branding-slot">
                  <div className="section-heading span-all">
                    <div>
                      <h3>{label} Image</h3>
                      <p className="sidebar-subtitle">
                        {slot === "header" ? "Appears at the top of each selected document page." : "Appears at the bottom of each selected document page."}
                      </p>
                    </div>
                    <div className="row-actions">
                      <button
                        type="button"
                        className="button-secondary"
                        onClick={() => updateBrandingSlot(slot, "imageDataUrl", undefined)}
                        disabled={!settings.imageDataUrl}
                      >
                        Remove Image
                      </button>
                    </div>
                  </div>

                  <label className="span-all">
                    Upload {label} Image
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => {
                        void handleBrandingImageUpload(slot, event.target.files);
                        event.currentTarget.value = "";
                      }}
                    />
                  </label>

                  <label>
                    Height (mm)
                    <input
                      type="number"
                      min="5"
                      max="80"
                      step="1"
                      value={settings.heightMm}
                      onChange={(event) => updateBrandingSlot(slot, "heightMm", Number(event.target.value))}
                    />
                  </label>
                  <label>
                    Fit
                    <select
                      value={settings.fit}
                      onChange={(event) => updateBrandingSlot(slot, "fit", event.target.value as "cover" | "contain")}
                    >
                      <option value="contain">Contain (no crop)</option>
                      <option value="cover">Cover (crop to fill)</option>
                    </select>
                  </label>
                  <label>
                    Position X (%)
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={settings.positionXPercent}
                      onChange={(event) => updateBrandingSlot(slot, "positionXPercent", Number(event.target.value))}
                    />
                    <small>{settings.positionXPercent}%</small>
                  </label>
                  <label>
                    Position Y (%)
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={settings.positionYPercent}
                      onChange={(event) => updateBrandingSlot(slot, "positionYPercent", Number(event.target.value))}
                    />
                    <small>{settings.positionYPercent}%</small>
                  </label>

                  <div className="span-all branding-preview-shell">
                    {settings.imageDataUrl ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={settings.imageDataUrl}
                          alt={`${label} preview`}
                          className="branding-preview-image"
                          style={{
                            objectFit: settings.fit,
                            objectPosition: `${settings.positionXPercent}% ${settings.positionYPercent}%`,
                            maxHeight: `${settings.heightMm * 2.8}px`,
                          }}
                        />
                      </>
                    ) : (
                      <p className="sidebar-subtitle">No image selected.</p>
                    )}
                  </div>
                </section>
              );
            })}

            <div className="section-heading span-all mt-sm">
              <div>
                <h3>Apply by Document Type</h3>
                <p className="sidebar-subtitle">Choose which document outputs should include the header/footer slots.</p>
              </div>
            </div>

            <div className="span-all table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Document Type</th>
                    <th style={{ width: "160px" }}>Apply Header</th>
                    <th style={{ width: "160px" }}>Apply Footer</th>
                  </tr>
                </thead>
                <tbody>
                  {(Object.keys(documentTypeLabels) as DocumentType[]).map((docType) => (
                    <tr key={docType}>
                      <td>{documentTypeLabels[docType]}</td>
                      <td>
                        <input
                          type="checkbox"
                          checked={form.documentBranding.applyByDocType[docType].header}
                          onChange={(event) => updateBrandingToggle(docType, "header", event.target.checked)}
                        />
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          checked={form.documentBranding.applyByDocType[docType].footer}
                          onChange={(event) => updateBrandingToggle(docType, "footer", event.target.checked)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {error ? <p className="error-text span-all">{error}</p> : null}
        {savedAt ? (
          <p className="sidebar-subtitle span-all">
            Last loaded version: {new Date(savedAt).toLocaleString()}
          </p>
        ) : null}
      </form>
    </section>
  );
}

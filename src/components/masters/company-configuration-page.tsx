"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api/client";
import { DEFAULT_ORG_ID } from "@/lib/config";
import { CenteredLoader } from "@/components/ui/centered-loader";
import { useToast } from "@/components/ui/toast";
import type {
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
  paymentTerms: string[];
  deliveryTerms: string[];
  priceUoms: string[];
  documentBranding: DocumentBrandingSettings;
  bulkReferenceKg: string;
  packagingDefinitions: PackagingDefinition[];
};

const documentTypeLabels: Record<DocumentType, string> = {
  invoice: "Commercial Invoice (ICC)",
  packing_list: "Packing List (ICC)",
  shipping_instructions: "Shipping Instruction",
  quality_certificate: "Certificate of Quality",
  weight_certificate: "Certificate of Weight",
  way_bill: "Way Bill",
  ico_certificate: "ICO Certificate of Origin",
};

function toFormState(configuration: CompanyConfiguration): CompanyConfigurationFormState {
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
    paymentTerms: configuration.paymentTerms,
    deliveryTerms: configuration.deliveryTerms,
    priceUoms: configuration.priceUoms,
    documentBranding: configuration.documentBranding,
    bulkReferenceKg: String(configuration.bulkReferenceKg),
    packagingDefinitions: configuration.packagingDefinitions,
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
  const [activeTab, setActiveTab] = useState<"general" | "branding">("general");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  async function loadConfiguration() {
    setLoading(true);
    setError(null);

    try {
      const data = await apiClient<CompanyConfiguration>(`/api/company-configuration?orgId=${DEFAULT_ORG_ID}`);
      setForm(toFormState(data));
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

    setSaving(true);
    setError(null);

    try {
      await apiClient<{ saved: boolean }>("/api/company-configuration", {
        method: "POST",
        body: JSON.stringify({
          orgId: DEFAULT_ORG_ID,
          companyConfiguration: {
            ...form,
            bulkReferenceKg: Number(form.bulkReferenceKg),
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

      <form className="card form-grid" onSubmit={handleSubmit}>
        <div className="section-heading span-all">
          <div>
            <h3>{activeTab === "general" ? "General Configuration" : "Document Branding"}</h3>
            <p className="sidebar-subtitle">
              {activeTab === "general"
                ? "Master company constants used throughout contract and document generation."
                : "A4-safe header and footer graphics for generated documents."}
            </p>
          </div>
          <div className="row-actions">
            <button type="button" className="button-secondary" onClick={() => void loadConfiguration()} disabled={loading || saving}>
              Refresh
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
        </div>

        {activeTab === "general" ? (
          <>
            <label>
              Seller Name
              <input value={form.sellerName} onChange={(event) => updateField("sellerName", event.target.value)} required />
            </label>
            <label>
              Company Email
              <input type="email" value={form.companyEmail} onChange={(event) => updateField("companyEmail", event.target.value)} />
            </label>
            <label className="span-all">
              Seller Address
              <textarea rows={3} value={form.sellerAddress} onChange={(event) => updateField("sellerAddress", event.target.value)} required />
            </label>
            <label className="span-all">
              Amharic Name
              <input value={form.sellerAmharicName} onChange={(event) => updateField("sellerAmharicName", event.target.value)} />
            </label>
            <label>
              Company Phone
              <input value={form.companyPhone} onChange={(event) => updateField("companyPhone", event.target.value)} />
            </label>

            <div className="section-heading span-all mt-sm">
              <div>
                <h3>Export Defaults</h3>
                <p className="sidebar-subtitle">Origin, HS code, ICO prefix, and issue location referenced by templates.</p>
              </div>
            </div>

            <label>
              Default Origin
              <input value={form.defaultOrigin} onChange={(event) => updateField("defaultOrigin", event.target.value)} required />
            </label>
            <label>
              Default HS Code
              <input value={form.defaultHsCode} onChange={(event) => updateField("defaultHsCode", event.target.value)} required />
            </label>
            <label>
              ICO Reference Prefix
              <input value={form.icoReferencePrefix} onChange={(event) => updateField("icoReferencePrefix", event.target.value)} required />
            </label>
            <label>
              Place of Issue
              <input value={form.placeOfIssue} onChange={(event) => updateField("placeOfIssue", event.target.value)} required />
            </label>
            <label>
              Bulk Reference Kg
              <input
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

            <div className="section-heading span-all mt-sm">
              <div>
                <h3>Transitor</h3>
                <p className="sidebar-subtitle">Transit partner details used in shipping-related documents.</p>
              </div>
            </div>
            <label className="span-all">
              Transitor Company Name
              <input value={form.transitorCompanyName} onChange={(event) => updateField("transitorCompanyName", event.target.value)} />
            </label>
            <label>
              Transitor Phone Number
              <input value={form.transitorPhoneNumber} onChange={(event) => updateField("transitorPhoneNumber", event.target.value)} />
            </label>
            <label>
              Transitor Location
              <input value={form.transitorLocation} onChange={(event) => updateField("transitorLocation", event.target.value)} />
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
                    <tr key={definition.label}>
                      <td>
                        <input
                          value={definition.label}
                          onChange={(event) => updatePackagingDefinition(index, "label", event.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          value={definition.uom}
                          onChange={(event) => updatePackagingDefinition(index, "uom", event.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.001"
                          value={definition.netWeightKg}
                          onChange={(event) => updatePackagingDefinition(index, "netWeightKg", event.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.001"
                          value={definition.tareWeightKg}
                          onChange={(event) => updatePackagingDefinition(index, "tareWeightKg", event.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.001"
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

"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api/client";
import { DEFAULT_ORG_ID } from "@/lib/config";
import type { CompanyConfiguration, PackagingDefinition } from "@/types/models";

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
  bulkReferenceKg: string;
  packagingDefinitions: PackagingDefinition[];
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
    bulkReferenceKg: String(configuration.bulkReferenceKg),
    packagingDefinitions: configuration.packagingDefinitions,
  };
}

export function CompanyConfigurationPage() {
  const [form, setForm] = useState<CompanyConfigurationFormState | null>(null);
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
    } catch (submitError) {
      setError((submitError as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading || !form) {
    return (
      <section className="page-shell">
        <header className="page-header">
          <h1>Company Configuration</h1>
          <p>Loading organization defaults from the workbook configuration model.</p>
        </header>
      </section>
    );
  }

  return (
    <section className="page-shell">
      <header className="page-header">
        <h1>Company Configuration</h1>
        <p>
          Organization-level defaults from the Excel <strong>Form Configuration</strong> sheet.
          These values feed document generation across all contracts.
        </p>
      </header>

      <form className="card form-grid" onSubmit={handleSubmit}>
        <div className="section-heading span-all">
          <div>
            <h3>Seller Identity</h3>
            <p className="sidebar-subtitle">Workbook owner information reused across invoices and shipping documents.</p>
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
            <h3>Payment and Delivery Terms</h3>
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
            <p className="sidebar-subtitle">Bag weights and tare values currently referenced by workbook formulas.</p>
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

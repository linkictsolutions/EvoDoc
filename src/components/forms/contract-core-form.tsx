"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { computeContractExcelParity } from "@/domain/excel-parity";
import { apiClient } from "@/lib/api/client";
import { DEFAULT_ORG_ID } from "@/lib/config";
import type { CompanyConfiguration, Customer } from "@/types/models";
import { CenteredLoader } from "@/components/ui/centered-loader";

const schema = z.object({
  customerName: z.string().min(1),
  customerAddress: z.string().min(1),
  customerCountry: z.string().min(1),
  contractNumber: z.string().min(1),
  quality: z.string().min(1),
  origin: z.string().min(1),
  grade: z.string().min(1),
  quantityBags: z.number().positive(),
  bagWeightKg: z.number().positive(),
  unitPrice: z.number().positive(),
  priceUnitForPrice: z.number().positive(),
  priceUom: z.string().min(1),
  packagingUnit: z.string().min(1),
  currency: z.string().min(1),
  shipmentPeriod: z.string().optional(),
  paymentTerm: z.string().min(1),
  deliveryTerm: z.string().min(1),
  cropYear: z.string().optional(),
  lastCertNo: z.number().int().nonnegative(),
});

type FormData = z.infer<typeof schema>;

const packagingOptions = ["Bag of 60Kg", "Bag of 50Kg", "Bag of 30Kg", "Kg", "Lbs", "Metric Ton", "Bulk"];
const fallbackPaymentTerms = ["CAD", "LC", "Advance & CAD", "Advance"];
const fallbackDeliveryTerms = ["F.O.B"];
const fallbackPriceUoms = ["Lbs", "Bag of 60Kg", "Bag of 50Kg", "Bag of 30Kg", "Kg", "Metric Ton"];

function resolveBagWeightFromPackagingUnit(unit: string): number {
  const normalized = unit.trim().toLowerCase();

  if (normalized === "bag of 60kg") {
    return 60;
  }
  if (normalized === "bag of 50kg") {
    return 50;
  }
  if (normalized === "bag of 30kg") {
    return 30;
  }
  if (normalized === "lbs" || normalized === "lb") {
    return 0.453592;
  }
  if (normalized === "metric ton" || normalized === "mt") {
    return 1000;
  }
  return 1;
}

interface ContractCoreFormProps {
  initialContractId?: string;
  autoLoadExisting?: boolean;
  continueHref?: string;
}

interface ContractDetailResponse {
  contract: {
    id: string;
    contractNumber: string;
    status: "draft" | "active" | "closed";
    terms: {
      quality: string;
      origin: string;
      grade: string;
      quantityBags: number;
      bagWeightKg: number;
      unitPrice: number;
      priceUnitForPrice?: number;
      priceUom?: string;
      packagingUnit: string;
      currency: string;
      shipmentPeriod?: string;
      paymentTerm?: string;
      deliveryTerm?: string;
      cropYear?: string;
      lastCertNo?: number;
    };
  };
  customer: Customer | null;
}

function toMonthInputValue(value?: string): string {
  const normalized = value?.trim();
  if (!normalized) {
    return "";
  }

  const isoMonthMatch = normalized.match(/^(\d{4}-\d{2})(?:-\d{2})?/);
  if (isoMonthMatch) {
    return isoMonthMatch[1];
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toISOString().slice(0, 7);
}

export function ContractCoreForm({
  initialContractId,
  autoLoadExisting = false,
  continueHref,
}: ContractCoreFormProps) {
  const [buyers, setBuyers] = useState<Customer[]>([]);
  const [selectedBuyerId, setSelectedBuyerId] = useState<string>("");
  const [apiError, setApiError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [savedContractId, setSavedContractId] = useState<string | null>(null);
  const [activeContractId, setActiveContractId] = useState<string | null>(initialContractId ?? null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [paymentTermOptions, setPaymentTermOptions] = useState<string[]>(fallbackPaymentTerms);
  const [deliveryTermOptions, setDeliveryTermOptions] = useState<string[]>(fallbackDeliveryTerms);
  const [priceUomOptions, setPriceUomOptions] = useState<string[]>(fallbackPriceUoms);

  const { register, watch, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      customerName: "",
      customerAddress: "",
      customerCountry: "",
      contractNumber: "",
      quality: "",
      origin: "",
      grade: "",
      bagWeightKg: 60,
      priceUom: "",
      packagingUnit: "",
      currency: "",
      shipmentPeriod: "",
      paymentTerm: "",
      deliveryTerm: "",
      cropYear: "",
    },
  });

  const values = watch();
  const packagingRegister = register("packagingUnit");

  const computed = useMemo(() => {
    try {
      return computeContractExcelParity({
        quality: values.quality,
        origin: values.origin,
        grade: values.grade,
        quantityBags: Number(values.quantityBags || 0),
        bagWeightKg: Number(values.bagWeightKg || 0),
        unitPrice: Number(values.unitPrice || 0),
        currency: values.currency,
        packagingUnit: values.packagingUnit,
        priceUom: values.priceUom,
        priceUnitForPrice: Number(values.priceUnitForPrice || 100),
        shipmentPeriod: values.shipmentPeriod,
        paymentTerm: values.paymentTerm,
        deliveryTerm: values.deliveryTerm,
        cropYear: values.cropYear,
        lastCertNo: Number(values.lastCertNo || 0),
      });
    } catch {
      return null;
    }
  }, [values]);

  async function onSubmit(form: FormData) {
    if (!selectedBuyerId) {
      setApiError("Select a buyer from Buyer Master before saving the contract.");
      return;
    }

    setSaving(true);
    setApiError(null);
    setWarnings([]);
    setSavedNotice(null);

    try {
      const result = await apiClient<{ contractId: string; warnings?: string[] }>("/api/contracts/core", {
        method: "POST",
        body: JSON.stringify({
          orgId: DEFAULT_ORG_ID,
          contractId: activeContractId ?? undefined,
          customer: {
            id: selectedBuyerId,
            name: form.customerName,
            address: form.customerAddress,
            country: form.customerCountry,
          },
          contract: {
            contractNumber: form.contractNumber,
            status: "draft",
            terms: {
              quality: form.quality,
              origin: form.origin,
              grade: form.grade,
              quantityBags: form.quantityBags,
              bagWeightKg: form.bagWeightKg,
              unitPrice: form.unitPrice,
              priceUnitForPrice: form.priceUnitForPrice,
              priceUom: form.priceUom,
              packagingUnit: form.packagingUnit,
              currency: form.currency,
              shipmentPeriod: form.shipmentPeriod,
              paymentTerm: form.paymentTerm,
              deliveryTerm: form.deliveryTerm,
              cropYear: form.cropYear,
              lastCertNo: form.lastCertNo,
            },
          },
        }),
      });

      setSavedContractId(result.contractId);
      setActiveContractId(result.contractId);
      setSavedNotice("Contract draft saved.");
      if (typeof window !== "undefined") {
        window.localStorage.setItem("evodoc.contractId", result.contractId);
      }
      setWarnings(result.warnings ?? []);
    } catch (error) {
      setApiError((error as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function onPackagingUnitChange(unit: string) {
    setValue("bagWeightKg", resolveBagWeightFromPackagingUnit(unit));
  }

  useEffect(() => {
    let mounted = true;

    apiClient<Customer[]>(`/api/customers?orgId=${DEFAULT_ORG_ID}`)
      .then((data) => {
        if (mounted) {
          setBuyers(data);
        }
      })
      .catch(() => {
        if (mounted) {
          setBuyers([]);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    apiClient<CompanyConfiguration>(`/api/company-configuration?orgId=${DEFAULT_ORG_ID}`)
      .then((configuration) => {
        if (!mounted) {
          return;
        }

        const terms = configuration.paymentTerms?.filter((term) => term.trim().length > 0) ?? [];
        const deliveryTerms = configuration.deliveryTerms?.filter((term) => term.trim().length > 0) ?? [];
        const priceUoms = configuration.priceUoms?.filter((uom) => uom.trim().length > 0) ?? [];
        if (terms.length === 0) {
          setPaymentTermOptions(fallbackPaymentTerms);
        } else {
          setPaymentTermOptions(terms);
        }
        if (deliveryTerms.length === 0) {
          setDeliveryTermOptions(fallbackDeliveryTerms);
        } else {
          setDeliveryTermOptions(deliveryTerms);
        }
        if (priceUoms.length === 0) {
          setPriceUomOptions(fallbackPriceUoms);
        } else {
          setPriceUomOptions(priceUoms);
        }
      })
      .catch(() => {
        if (mounted) {
          setPaymentTermOptions(fallbackPaymentTerms);
          setDeliveryTermOptions(fallbackDeliveryTerms);
          setPriceUomOptions(fallbackPriceUoms);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const currentPriceUom = (watch("priceUom") ?? "").trim();
    if (currentPriceUom) {
      return;
    }

    if (priceUomOptions.length === 0) {
      return;
    }

    setValue("priceUom", priceUomOptions[0]);
  }, [priceUomOptions, setValue, watch]);

  useEffect(() => {
    if (!autoLoadExisting || !initialContractId) {
      return;
    }

    let mounted = true;
    setLoadingExisting(true);
    setApiError(null);

    apiClient<ContractDetailResponse>(`/api/contracts/${initialContractId}?orgId=${DEFAULT_ORG_ID}`)
      .then((data) => {
        if (!mounted) {
          return;
        }

        const terms = data.contract.terms;
        const customer = data.customer;
        const contractIdentifier = data.contract.contractNumber;

        setActiveContractId(contractIdentifier);
        setSavedContractId(contractIdentifier);
        setSelectedBuyerId(customer?.id ?? "");
        setValue("contractNumber", data.contract.contractNumber);
        setValue("customerName", customer?.name ?? "");
        setValue("customerAddress", customer?.address ?? "");
        setValue("customerCountry", customer?.country ?? "");
        setValue("quality", terms.quality);
        setValue("origin", terms.origin);
        setValue("grade", terms.grade);
        setValue("quantityBags", terms.quantityBags);
        setValue("bagWeightKg", terms.bagWeightKg);
        setValue("unitPrice", terms.unitPrice);
        setValue("priceUnitForPrice", terms.priceUnitForPrice ?? 100);
        setValue("priceUom", terms.priceUom ?? "Lbs");
        setValue("packagingUnit", terms.packagingUnit);
        setValue("currency", terms.currency);
        setValue("shipmentPeriod", toMonthInputValue(terms.shipmentPeriod));
        setValue("paymentTerm", terms.paymentTerm ?? paymentTermOptions[0] ?? "CAD");
        setValue("deliveryTerm", terms.deliveryTerm ?? deliveryTermOptions[0] ?? fallbackDeliveryTerms[0]);
        setValue("cropYear", terms.cropYear ?? "");
        setValue("lastCertNo", terms.lastCertNo ?? 0);
      })
      .catch((error: Error) => {
        if (mounted) {
          setApiError(error.message);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoadingExisting(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [autoLoadExisting, deliveryTermOptions, initialContractId, paymentTermOptions, setValue]);

  useEffect(() => {
    if (!selectedBuyerId) {
      return;
    }

    const selectedBuyer = buyers.find((buyer) => buyer.id === selectedBuyerId);
    if (!selectedBuyer) {
      return;
    }

    setValue("customerName", selectedBuyer.name);
    setValue("customerAddress", selectedBuyer.address);
    setValue("customerCountry", selectedBuyer.country);
  }, [buyers, selectedBuyerId, setValue]);

  const shippingHref = continueHref ?? (savedContractId
    ? `/app/contracts/${encodeURIComponent(savedContractId)}/inputs/shipping-instruction`
    : "");

  return (
    <section className="page-shell">
      <header className="page-header">
        <h1>Contract Source Document</h1>
        <p>Start the export workflow by completing the core contract source document.</p>
        {loadingExisting ? <CenteredLoader label="Loading existing contract data..." scope="inline" /> : null}
      </header>

      <form className="card form-grid" onSubmit={handleSubmit(onSubmit)}>
        <label>
          Contract Number
          <input {...register("contractNumber")} />
          <small>{errors.contractNumber?.message}</small>
        </label>
        <label>
          Buyer
          <select value={selectedBuyerId} onChange={(event) => setSelectedBuyerId(event.target.value)} required>
            <option value="">Select saved buyer</option>
            {buyers.map((buyer) => (
              <option key={buyer.id} value={buyer.id}>
                {buyer.name}
              </option>
            ))}
          </select>
          <small>{buyers.length === 0 ? "No buyers found. Create one in Master Data > Buyers." : ""}</small>
        </label>
        <label>
          Buyer Name
          <input {...register("customerName")} readOnly />
          <small>{errors.customerName?.message}</small>
        </label>
        <label>
          Buyer Address
          <input {...register("customerAddress")} readOnly />
          <small>{errors.customerAddress?.message}</small>
        </label>
        <label>
          Buyer Country
          <input {...register("customerCountry")} readOnly />
          <small>{errors.customerCountry?.message}</small>
        </label>

        <label>
          Quality
          <textarea rows={3} {...register("quality")} />
        </label>
        <label>
          Origin
          <input {...register("origin")} />
        </label>
        <label>
          Grade
          <input {...register("grade")} />
        </label>
        <label>
          Packaging Unit
          <select
            {...packagingRegister}
            onChange={(event) => {
              packagingRegister.onChange(event);
              onPackagingUnitChange(event.target.value);
            }}
          >
            <option value="">Select packaging unit</option>
            {packagingOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>

        <label>
          Quantity (Main Unit)
          <input type="number" step="0.001" {...register("quantityBags", { valueAsNumber: true })} />
        </label>
        <label>
          Unit Price
          <input type="number" step="0.01" {...register("unitPrice", { valueAsNumber: true })} />
        </label>
        <label>
          Price Unit Base
          <input type="number" step="1" {...register("priceUnitForPrice", { valueAsNumber: true })} />
        </label>
        <label>
          Price UoM
          <select {...register("priceUom")}>
            <option value="">Select price UoM</option>
            {priceUomOptions.map((uom) => (
              <option key={uom} value={uom}>{uom}</option>
            ))}
          </select>
        </label>
        <label>
          Currency
          <input {...register("currency")} />
        </label>
        <input type="hidden" {...register("bagWeightKg", { valueAsNumber: true })} />

        <label>
          Shipment Period
          <input type="month" {...register("shipmentPeriod")} />
        </label>
        <label>
          Payment Term
          <select {...register("paymentTerm")}>
            <option value="">Select payment term</option>
            {paymentTermOptions.map((term) => (
              <option key={term} value={term}>{term}</option>
            ))}
          </select>
        </label>
        <label>
          Delivery Term
          <select {...register("deliveryTerm")}>
            <option value="">Select delivery term</option>
            {deliveryTermOptions.map((term) => (
              <option key={term} value={term}>{term}</option>
            ))}
          </select>
        </label>
        <label>
          Crop Year
          <input {...register("cropYear")} />
        </label>
        <label>
          Last Cert No
          <input type="number" step="1" {...register("lastCertNo", { valueAsNumber: true })} />
        </label>

        <div className="row-actions">
          <button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Contract Draft"}</button>
          {savedContractId && shippingHref ? (
            <Link href={shippingHref}>
              <button type="button" className="button-secondary">Continue to Shipping Instruction</button>
            </Link>
          ) : null}
        </div>
        {savedNotice ? <p>{savedNotice}</p> : null}
        {apiError ? <p className="error-text">{apiError}</p> : null}
        {warnings.length > 0 ? (
          <div className="span-all">
            <strong>Warnings</strong>
            <ul className="list-indent">
              {warnings.map((warning) => <li key={warning}>{warning}</li>)}
            </ul>
          </div>
        ) : null}
      </form>

      <section className="card">
        <h3>Auto-Calculated Values</h3>
        {!computed ? (
          <p>Enter valid numeric values to compute totals.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <tbody>
                <tr><th>Total Price</th><td>{computed.totalPrice.toFixed(2)}</td></tr>
                <tr><th>Quantity Kg</th><td>{computed.quantityKg.toFixed(3)}</td></tr>
                <tr><th>Quantity Lb</th><td>{computed.quantityLb.toFixed(3)}</td></tr>
                <tr><th>Quantity MT</th><td>{computed.quantityMt.toFixed(3)}</td></tr>
                <tr><th>Gross Weight Kg</th><td>{computed.grossWeightKg.toFixed(3)}</td></tr>
                <tr><th>Gross Weight MT</th><td>{computed.grossWeightMt.toFixed(3)}</td></tr>
                <tr><th>Qty Bag 60</th><td>{computed.quantityBag60.toFixed(3)}</td></tr>
                <tr><th>Qty Bag 50</th><td>{computed.quantityBag50.toFixed(3)}</td></tr>
                <tr><th>Qty Bag 30</th><td>{computed.quantityBag30.toFixed(3)}</td></tr>
                <tr><th>Unit Price Bag 60</th><td>{computed.unitPriceBag60.toFixed(2)}</td></tr>
                <tr><th>Unit Price Bag 50</th><td>{computed.unitPriceBag50.toFixed(2)}</td></tr>
                <tr><th>Unit Price Bag 30</th><td>{computed.unitPriceBag30.toFixed(2)}</td></tr>
                <tr><th>No. of Bags</th><td>{computed.noOfBags.toFixed(3)}</td></tr>
                <tr><th>Container Count</th><td>{computed.containerCount}</td></tr>
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}

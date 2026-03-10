"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { computeContractExcelParity } from "@/domain/excel-parity";
import { apiClient } from "@/lib/api/client";
import { DEFAULT_ORG_ID } from "@/lib/config";
import type { Customer } from "@/types/models";

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

export function ContractCoreForm({
  initialContractId,
  autoLoadExisting = false,
  continueHref,
}: ContractCoreFormProps) {
  const [apiError, setApiError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [savedContractId, setSavedContractId] = useState<string | null>(null);
  const [activeContractId, setActiveContractId] = useState<string | null>(initialContractId ?? null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(false);

  const { register, watch, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      customerCountry: "Germany",
      quality: "UNWASHED ARABICA",
      origin: "ETHIOPIA",
      grade: "G1",
      quantityBags: 320,
      bagWeightKg: 60,
      unitPrice: 154,
      priceUnitForPrice: 100,
      priceUom: "Lbs",
      packagingUnit: "Bag of 60Kg",
      currency: "USD",
      paymentTerm: "CAD",
      deliveryTerm: "F.O.B",
      cropYear: "2025/26",
      lastCertNo: 22,
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
    if (unit === "Bag of 60Kg") setValue("bagWeightKg", 60);
    if (unit === "Bag of 50Kg") setValue("bagWeightKg", 50);
    if (unit === "Bag of 30Kg") setValue("bagWeightKg", 30);
  }

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

        setActiveContractId(data.contract.id);
        setSavedContractId(data.contract.id);
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
        setValue("shipmentPeriod", terms.shipmentPeriod ?? "");
        setValue("paymentTerm", terms.paymentTerm ?? "CAD");
        setValue("deliveryTerm", terms.deliveryTerm ?? "F.O.B");
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
  }, [autoLoadExisting, initialContractId, setValue]);

  const shippingHref = continueHref ?? (savedContractId
    ? `/app/contracts/${savedContractId}/inputs/shipping-instruction`
    : "");

  return (
    <section className="page-shell">
      <header className="page-header">
        <h1>Contract Input</h1>
        <p>Fill Contract sheet fields first. Contract Number is stored as business reference.</p>
        <div className="row-actions" style={{ marginTop: "0.75rem" }}>
          <Link href="/app/masters/customers">
            <button type="button">Manage Customers</button>
          </Link>
          <Link href="/app/masters/items">
            <button type="button">Manage Items</button>
          </Link>
        </div>
        {loadingExisting ? <p>Loading existing contract data...</p> : null}
      </header>

      <form className="card form-grid" onSubmit={handleSubmit(onSubmit)}>
        <label>
          Contract Number
          <input {...register("contractNumber")} />
          <small>{errors.contractNumber?.message}</small>
        </label>
        <label>
          Buyer Name
          <input {...register("customerName")} />
          <small>{errors.customerName?.message}</small>
        </label>
        <label>
          Buyer Address
          <input {...register("customerAddress")} />
          <small>{errors.customerAddress?.message}</small>
        </label>
        <label>
          Buyer Country
          <input {...register("customerCountry")} />
          <small>{errors.customerCountry?.message}</small>
        </label>

        <label>
          Quality
          <input {...register("quality")} />
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
          Main Unit Weight (kg)
          <input type="number" step="0.001" {...register("bagWeightKg", { valueAsNumber: true })} />
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
          <input {...register("priceUom")} />
        </label>
        <label>
          Currency
          <input {...register("currency")} />
        </label>

        <label>
          Shipment Period
          <input {...register("shipmentPeriod")} />
        </label>
        <label>
          Payment Term
          <input {...register("paymentTerm")} />
        </label>
        <label>
          Delivery Term
          <input {...register("deliveryTerm")} />
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
              <button type="button">Continue to Shipping Instruction</button>
            </Link>
          ) : null}
        </div>
        {savedNotice ? <p>{savedNotice}</p> : null}
        {apiError ? <p className="error-text">{apiError}</p> : null}
        {warnings.length > 0 ? (
          <div>
            <strong>Warnings</strong>
            <ul style={{ paddingLeft: "1rem" }}>
              {warnings.map((warning) => <li key={warning}>{warning}</li>)}
            </ul>
          </div>
        ) : null}
      </form>

      <section className="card">
        <h3>Auto-Calculated (Excel Parity)</h3>
        {!computed ? (
          <p>Enter valid numeric values to compute parity outputs.</p>
        ) : (
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
        )}
      </section>
    </section>
  );
}

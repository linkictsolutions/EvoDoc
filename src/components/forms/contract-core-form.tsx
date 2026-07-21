"use client";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { computeContractExcelParity } from "@/domain/excel-parity";
import { apiClient } from "@/lib/api/client";
import { DEFAULT_ORG_ID } from "@/lib/config";
import type { AttachmentRef, CompanyConfiguration, Customer } from "@/types/models";
import { CenteredLoader } from "@/components/ui/centered-loader";
import { AttachmentsField } from "@/components/ui/attachments";
import { useToast } from "@/components/ui/toast";
import { useUnsavedChangesGuard } from "@/components/ui/use-unsaved-changes-guard";

const schema = z.object({
  buyerId: z.string().min(1, "Buyer is required"),
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
const fallbackCurrencies = ["USD"];

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
  sourceInputs?: Array<{ id: string; sourceType?: string; payload?: unknown }>;
}

type BuyerModalForm = {
  name: string;
  address: string;
  country: string;
  contactName: string;
  contactEmail: string;
  taxId: string;
};

const initialBuyerModalForm: BuyerModalForm = {
  name: "",
  address: "",
  country: "Ethiopia",
  contactName: "",
  contactEmail: "",
  taxId: "",
};

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
  const toast = useToast();
  const [buyers, setBuyers] = useState<Customer[]>([]);
  const [selectedBuyerId, setSelectedBuyerId] = useState<string>("");
  const [apiError, setApiError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [savedContractId, setSavedContractId] = useState<string | null>(null);
  const [activeContractId, setActiveContractId] = useState<string | null>(initialContractId ?? null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<AttachmentRef[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [paymentTermOptions, setPaymentTermOptions] = useState<string[]>(fallbackPaymentTerms);
  const [deliveryTermOptions, setDeliveryTermOptions] = useState<string[]>(fallbackDeliveryTerms);
  const [priceUomOptions, setPriceUomOptions] = useState<string[]>(fallbackPriceUoms);
  const [currencyOptions, setCurrencyOptions] = useState<string[]>(fallbackCurrencies);
  const [buyerModalOpen, setBuyerModalOpen] = useState(false);
  const [buyerModalForm, setBuyerModalForm] = useState<BuyerModalForm>(initialBuyerModalForm);
  const [buyerModalSaving, setBuyerModalSaving] = useState(false);
  const [buyerModalAttemptedSubmit, setBuyerModalAttemptedSubmit] = useState(false);

  const [highlightDirty, setHighlightDirty] = useState(false);
  const lastSavedRef = useRef<{ form: Partial<FormData>; attachments: AttachmentRef[] }>({ form: {}, attachments: [] });

  const { register, watch, handleSubmit, setValue, reset, formState: { errors, isDirty, dirtyFields } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      buyerId: "",
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

  useUnsavedChangesGuard({
    enabled: isDirty && !saving,
    onBlockedNavigation: () => setHighlightDirty(true),
  });

  const isFieldDirty = useCallback((name: keyof FormData) => Boolean((dirtyFields as Record<string, unknown>)[name]), [dirtyFields]);
  const dirtyControlClass = useCallback((name: keyof FormData) => (highlightDirty && isFieldDirty(name) ? "field-error-control" : undefined), [highlightDirty, isFieldDirty]);

  const values = watch();
  const packagingRegister = register("packagingUnit");

  function requiredLabelClass(hasError: boolean) {
    return hasError ? "is-required field-error" : "is-required";
  }

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
          attachments,
          customer: {
            id: form.buyerId,
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
      lastSavedRef.current = { form, attachments };
      setHighlightDirty(false);
      reset(form, { keepDirty: false, keepTouched: false });
      toast.success("Contract saved.");
      if (typeof window !== "undefined") {
        window.localStorage.setItem("evodoc.contractId", result.contractId);
      }
      setWarnings(result.warnings ?? []);
    } catch (error) {
      setApiError((error as Error).message);
      toast.error("Unable to save contract.");
    } finally {
      setSaving(false);
    }
  }

  function discardChanges() {
    const snapshot = lastSavedRef.current;
    if (snapshot?.form) {
      reset(snapshot.form as FormData, { keepDirty: false, keepTouched: false });
    }
    setAttachments(snapshot.attachments ?? []);
    setHighlightDirty(false);
    toast.info("Discarded unsaved changes.");
  }

  function onPackagingUnitChange(unit: string) {
    setValue("bagWeightKg", resolveBagWeightFromPackagingUnit(unit));
  }

  const loadBuyers = useCallback(async (nextSelectedBuyerId?: string) => {
    try {
      const data = await apiClient<Customer[]>(`/api/customers?orgId=${DEFAULT_ORG_ID}`);
      setBuyers(data);

      if (nextSelectedBuyerId) {
        const selectedBuyer = data.find((buyer) => buyer.id === nextSelectedBuyerId);
        if (selectedBuyer) {
          setSelectedBuyerId(selectedBuyer.id);
          setValue("buyerId", selectedBuyer.id, { shouldValidate: true, shouldDirty: true });
          setValue("customerName", selectedBuyer.name, { shouldValidate: true, shouldDirty: true });
          setValue("customerAddress", selectedBuyer.address, { shouldValidate: true, shouldDirty: true });
          setValue("customerCountry", selectedBuyer.country, { shouldValidate: true, shouldDirty: true });
        }
      }
    } catch {
      setBuyers([]);
    }
  }, [setValue]);

  useEffect(() => {
    void loadBuyers();
  }, [loadBuyers]);

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
        const currencies = configuration.currencies?.filter((currency) => currency.trim().length > 0) ?? [];
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
        if (currencies.length === 0) {
          setCurrencyOptions(fallbackCurrencies);
        } else {
          setCurrencyOptions(currencies);
        }
      })
      .catch(() => {
        if (mounted) {
          setPaymentTermOptions(fallbackPaymentTerms);
          setDeliveryTermOptions(fallbackDeliveryTerms);
          setPriceUomOptions(fallbackPriceUoms);
          setCurrencyOptions(fallbackCurrencies);
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
        const buyerId = customer?.id ?? "";
        const contractSource = data.sourceInputs?.find(
          (input) => input.id === "contract_sheet" || input.sourceType === "contract_sheet",
        );
        const storedAttachments = (contractSource?.payload as { attachments?: AttachmentRef[] } | undefined)?.attachments ?? [];
        setAttachments(Array.isArray(storedAttachments) ? storedAttachments : []);
        lastSavedRef.current = {
          form: {
            buyerId,
            contractNumber: data.contract.contractNumber,
            customerName: customer?.name ?? "",
            customerAddress: customer?.address ?? "",
            customerCountry: customer?.country ?? "",
            quality: terms.quality,
            origin: terms.origin,
            grade: terms.grade,
            quantityBags: terms.quantityBags,
            bagWeightKg: terms.bagWeightKg,
            unitPrice: terms.unitPrice,
            priceUnitForPrice: terms.priceUnitForPrice ?? 100,
            priceUom: terms.priceUom ?? "Lbs",
            packagingUnit: terms.packagingUnit,
            currency: terms.currency,
            shipmentPeriod: toMonthInputValue(terms.shipmentPeriod),
            paymentTerm: terms.paymentTerm ?? paymentTermOptions[0] ?? "CAD",
            deliveryTerm: terms.deliveryTerm ?? deliveryTermOptions[0] ?? fallbackDeliveryTerms[0],
            cropYear: terms.cropYear ?? "",
            lastCertNo: terms.lastCertNo ?? 0,
          },
          attachments: Array.isArray(storedAttachments) ? storedAttachments : [],
        };
        setHighlightDirty(false);

        setActiveContractId(contractIdentifier);
        setSavedContractId(contractIdentifier);
        setSelectedBuyerId(buyerId);
        reset(
          {
            buyerId,
            contractNumber: data.contract.contractNumber,
            customerName: customer?.name ?? "",
            customerAddress: customer?.address ?? "",
            customerCountry: customer?.country ?? "",
            quality: terms.quality,
            origin: terms.origin,
            grade: terms.grade,
            quantityBags: terms.quantityBags,
            bagWeightKg: terms.bagWeightKg,
            unitPrice: terms.unitPrice,
            priceUnitForPrice: terms.priceUnitForPrice ?? 100,
            priceUom: terms.priceUom ?? "Lbs",
            packagingUnit: terms.packagingUnit,
            currency: terms.currency,
            shipmentPeriod: toMonthInputValue(terms.shipmentPeriod),
            paymentTerm: terms.paymentTerm ?? paymentTermOptions[0] ?? "CAD",
            deliveryTerm: terms.deliveryTerm ?? deliveryTermOptions[0] ?? fallbackDeliveryTerms[0],
            cropYear: terms.cropYear ?? "",
            lastCertNo: terms.lastCertNo ?? 0,
          },
          {
            keepDirty: false,
            keepTouched: false,
          },
        );
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
  }, [autoLoadExisting, deliveryTermOptions, initialContractId, paymentTermOptions, reset]);

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

  function updateBuyerModalField<Key extends keyof BuyerModalForm>(key: Key, value: BuyerModalForm[Key]) {
    setBuyerModalForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function closeBuyerModal() {
    if (buyerModalSaving) {
      return;
    }
    setBuyerModalOpen(false);
    setBuyerModalForm(initialBuyerModalForm);
    setBuyerModalAttemptedSubmit(false);
  }

  async function saveBuyerFromModal() {
    setBuyerModalAttemptedSubmit(true);

    if (
      buyerModalForm.name.trim().length === 0
      || buyerModalForm.address.trim().length === 0
      || buyerModalForm.country.trim().length === 0
    ) {
      toast.error("Fill in the required buyer fields.");
      return;
    }

    setBuyerModalSaving(true);
    try {
      const result = await apiClient<{ customerId: string }>("/api/customers", {
        method: "POST",
        body: JSON.stringify({
          orgId: DEFAULT_ORG_ID,
          customer: buyerModalForm,
        }),
      });
      await loadBuyers(result.customerId);
      closeBuyerModal();
      toast.success("Buyer saved.");
    } catch (error) {
      toast.error((error as Error).message || "Unable to save buyer.");
    } finally {
      setBuyerModalSaving(false);
    }
  }

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

      <form
        className="card form-grid"
        onSubmit={handleSubmit(onSubmit, () => toast.error("Fill in the required fields."))}
      >
        <h3 className="span-all">Contract Identity</h3>
        <label className={requiredLabelClass(Boolean(errors.contractNumber))}>
          <span className="label-text">Contract Number</span>
          <input className={dirtyControlClass("contractNumber")} {...register("contractNumber")} />
          <small>{errors.contractNumber?.message}</small>
        </label>
        <label className={requiredLabelClass(Boolean(errors.buyerId))}>
          <span className="label-text">Buyer</span>
          <input type="hidden" {...register("buyerId")} />
          <select
            className={dirtyControlClass("buyerId")}
            value={selectedBuyerId}
            onChange={(event) => {
              const buyerId = event.target.value;
              setSelectedBuyerId(buyerId);
              setValue("buyerId", buyerId, { shouldValidate: true, shouldDirty: true });
            }}
          >
            <option value="">Select saved buyer</option>
            {buyers.map((buyer) => (
              <option key={buyer.id} value={buyer.id}>
                {buyer.name}
              </option>
            ))}
          </select>
          <small>{errors.buyerId?.message ?? (buyers.length === 0 ? "No buyers found. Create one in Master Data > Buyers." : "")}</small>
        </label>
        <div className="span-all form-field-action" style={{ marginTop: "-0.4rem" }}>
          <button
            type="button"
            className="button-secondary"
            onClick={() => setBuyerModalOpen(true)}
          >
            + Register new buyer
          </button>
        </div>

        <label className={requiredLabelClass(Boolean(errors.customerName))}>
          <span className="label-text">Buyer Name</span>
          <input {...register("customerName")} readOnly />
          <small>{errors.customerName?.message}</small>
        </label>
        <label className={requiredLabelClass(Boolean(errors.customerCountry))}>
          <span className="label-text">Buyer Country</span>
          <input {...register("customerCountry")} readOnly />
          <small>{errors.customerCountry?.message}</small>
        </label>
        <label className={`span-all ${requiredLabelClass(Boolean(errors.customerAddress))}`}>
          <span className="label-text">Buyer Address</span>
          <textarea rows={3} {...register("customerAddress")} readOnly />
          <small>{errors.customerAddress?.message}</small>
        </label>

        <AttachmentsField
          orgId={DEFAULT_ORG_ID}
          contractId={activeContractId ?? savedContractId ?? values.contractNumber ?? "draft"}
          stage="contract_sheet"
          value={attachments}
          onChange={setAttachments}
          helperText="Attach the original contract file(s) for this source document."
        />

        <h3 className="span-all">Product Details</h3>
        <div className="form-stack">
          <label className={requiredLabelClass(Boolean(errors.origin))}>
            <span className="label-text">Origin</span>
            <input className={dirtyControlClass("origin")} {...register("origin")} />
          </label>
          <label className={requiredLabelClass(Boolean(errors.grade))}>
            <span className="label-text">Grade</span>
            <input className={dirtyControlClass("grade")} {...register("grade")} />
          </label>
        </div>
        <label className={requiredLabelClass(Boolean(errors.quality))}>
          <span className="label-text">Quality</span>
          <textarea className={dirtyControlClass("quality")} rows={4} {...register("quality")} />
        </label>
        <label className={requiredLabelClass(Boolean(errors.packagingUnit))}>
          <span className="label-text">Packaging Unit</span>
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
          Last Cert No
          <input type="number" step="1" {...register("lastCertNo", { valueAsNumber: true })} />
        </label>

        <h3 className="span-all">Commercial Terms</h3>
        <div className="span-all form-dense">
          <label className={requiredLabelClass(Boolean(errors.quantityBags))}>
            <span className="label-text">Quantity (Main Unit)</span>
            <input className={dirtyControlClass("quantityBags")} type="number" step="0.001" {...register("quantityBags", { valueAsNumber: true })} />
          </label>
          <label className={requiredLabelClass(Boolean(errors.unitPrice))}>
            <span className="label-text">Unit Price</span>
            <input className={dirtyControlClass("unitPrice")} type="number" step="0.01" {...register("unitPrice", { valueAsNumber: true })} />
          </label>
          <label className={requiredLabelClass(Boolean(errors.priceUnitForPrice))}>
            <span className="label-text">Price Unit Base</span>
            <input className={dirtyControlClass("priceUnitForPrice")} type="number" step="1" {...register("priceUnitForPrice", { valueAsNumber: true })} />
          </label>
        </div>
        <label className={requiredLabelClass(Boolean(errors.priceUom))}>
          <span className="label-text">Price UoM</span>
          <select className={dirtyControlClass("priceUom")} {...register("priceUom")}>
            <option value="">Select price UoM</option>
            {priceUomOptions.map((uom) => (
              <option key={uom} value={uom}>{uom}</option>
            ))}
          </select>
        </label>
        <label className={requiredLabelClass(Boolean(errors.currency))}>
          <span className="label-text">Currency</span>
          <select className={dirtyControlClass("currency")} {...register("currency")}>
            <option value="">Select currency</option>
            {values.currency && !currencyOptions.includes(values.currency) ? (
              <option value={values.currency}>{values.currency}</option>
            ) : null}
            {currencyOptions.map((currency) => (
              <option key={currency} value={currency}>{currency}</option>
            ))}
          </select>
        </label>
        <input type="hidden" {...register("bagWeightKg", { valueAsNumber: true })} />

        <label className={requiredLabelClass(Boolean(errors.paymentTerm))}>
          <span className="label-text">Payment Term</span>
          <select className={dirtyControlClass("paymentTerm")} {...register("paymentTerm")}>
            <option value="">Select payment term</option>
            {paymentTermOptions.map((term) => (
              <option key={term} value={term}>{term}</option>
            ))}
          </select>
        </label>
        <label className={requiredLabelClass(Boolean(errors.deliveryTerm))}>
          <span className="label-text">Delivery Term</span>
          <select {...register("deliveryTerm")}>
            <option value="">Select delivery term</option>
            {deliveryTermOptions.map((term) => (
              <option key={term} value={term}>{term}</option>
            ))}
          </select>
        </label>
        <label>
          Shipment Period
          <input className={dirtyControlClass("shipmentPeriod")} type="month" {...register("shipmentPeriod")} />
        </label>
        <label>
          Crop Year
          <input {...register("cropYear")} />
        </label>

        <div className="row-actions">
          <button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Contract Draft"}</button>
          <button type="button" className="button-secondary" disabled={!isDirty || saving} onClick={discardChanges}>
            Discard changes
          </button>
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
              <tr><th>Quantity Lb</th><td>{computed.quantityLb.toFixed(4)}</td></tr>
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

      {buyerModalOpen ? (
        <div className="confirm-modal-backdrop" onClick={closeBuyerModal}>
          <section
            className="confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="buyer-modal-title"
            onClick={(event) => event.stopPropagation()}
            style={{ width: "min(680px, 100%)" }}
          >
            <div>
              <h3 id="buyer-modal-title">Register New Buyer</h3>
              <p className="sidebar-subtitle">Create the buyer here and it will be selected on this contract.</p>
            </div>

            <div className="form-grid" style={{ padding: 0 }}>
              <label className={`span-all ${buyerModalAttemptedSubmit && buyerModalForm.name.trim().length === 0 ? "is-required field-error" : "is-required"}`}>
                <span className="label-text">Legal Name</span>
                <input
                  className={buyerModalAttemptedSubmit && buyerModalForm.name.trim().length === 0 ? "field-error-control" : undefined}
                  value={buyerModalForm.name}
                  onChange={(event) => updateBuyerModalField("name", event.target.value)}
                />
              </label>
              <label className={`span-all ${buyerModalAttemptedSubmit && buyerModalForm.address.trim().length === 0 ? "is-required field-error" : "is-required"}`}>
                <span className="label-text">Address</span>
                <textarea
                  rows={4}
                  className={buyerModalAttemptedSubmit && buyerModalForm.address.trim().length === 0 ? "field-error-control" : undefined}
                  value={buyerModalForm.address}
                  onChange={(event) => updateBuyerModalField("address", event.target.value)}
                />
              </label>
              <label className={buyerModalAttemptedSubmit && buyerModalForm.country.trim().length === 0 ? "is-required field-error" : "is-required"}>
                <span className="label-text">Country</span>
                <input
                  className={buyerModalAttemptedSubmit && buyerModalForm.country.trim().length === 0 ? "field-error-control" : undefined}
                  value={buyerModalForm.country}
                  onChange={(event) => updateBuyerModalField("country", event.target.value)}
                />
              </label>
              <label>
                <span className="label-text">Tax ID</span>
                <input
                  value={buyerModalForm.taxId}
                  onChange={(event) => updateBuyerModalField("taxId", event.target.value)}
                />
              </label>
              <label>
                <span className="label-text">Contact Name</span>
                <input
                  value={buyerModalForm.contactName}
                  onChange={(event) => updateBuyerModalField("contactName", event.target.value)}
                />
              </label>
              <label>
                <span className="label-text">Contact Email</span>
                <input
                  type="email"
                  value={buyerModalForm.contactEmail}
                  onChange={(event) => updateBuyerModalField("contactEmail", event.target.value)}
                />
              </label>
            </div>

            <div className="row-actions confirm-modal-actions">
              <button type="button" className="button-secondary" onClick={closeBuyerModal} disabled={buyerModalSaving}>
                Cancel
              </button>
              <button type="button" onClick={() => void saveBuyerFromModal()} disabled={buyerModalSaving}>
                {buyerModalSaving ? "Saving..." : "Save Buyer"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}

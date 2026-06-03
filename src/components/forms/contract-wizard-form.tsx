"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiClient } from "@/lib/api/client";
import { DEFAULT_ORG_ID } from "@/lib/config";
import type { CompanyConfiguration } from "@/types/models";
import { useToast } from "@/components/ui/toast";
import { useUnsavedChangesGuard } from "@/components/ui/use-unsaved-changes-guard";

const formSchema = z.object({
  customerName: z.string().min(1),
  customerAddress: z.string().min(1),
  customerCountry: z.string().min(1),
  contractNumber: z.string().min(1),
  quality: z.string().min(1),
  origin: z.string().min(1),
  grade: z.string().min(1),
  quantityBags: z.number().int().nonnegative(),
  bagWeightKg: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  priceUnitForPrice: z.number().positive(),
  priceUom: z.string().min(1),
  currency: z.string().min(1),
  packagingUnit: z.string().min(1),
  shipmentPeriod: z.string().optional(),
  paymentTerm: z.string().min(1),
  deliveryTerm: z.string().min(1),
  cropYear: z.string().optional(),
  lastCertNo: z.number().int().nonnegative(),
  destinationPort: z.string().min(1),
  shippingLine: z.string().min(1),
  alternative1: z.string().optional(),
  alternative2: z.string().optional(),
  portOfLoading: z.string().min(1),
  bagMarkings: z.string().optional(),
  consignee: z.string().optional(),
  notifyParty: z.string().optional(),
  secondNotify: z.string().optional(),
  bookingNumber: z.string().optional(),
  beneficiaryBank: z.string().min(1),
  accountNumber: z.string().min(1),
  stationName: z.string().min(1),
  stationAddress: z.string().min(1),
  moisturePercent: z.number().nonnegative(),
});

type FormData = z.infer<typeof formSchema>;
const fallbackPaymentTerms = ["CAD", "LC", "Advance & CAD", "Advance"];
const fallbackDeliveryTerms = ["F.O.B"];
const fallbackCurrencies = ["USD"];

const stepFields: Array<Array<keyof FormData>> = [
  ["contractNumber", "customerName", "customerAddress", "customerCountry"],
  [
    "quality",
    "origin",
    "grade",
    "quantityBags",
    "bagWeightKg",
    "unitPrice",
    "priceUnitForPrice",
    "priceUom",
    "currency",
    "packagingUnit",
    "paymentTerm",
    "deliveryTerm",
    "lastCertNo",
  ],
  ["destinationPort", "shippingLine", "portOfLoading", "bagMarkings"],
  ["beneficiaryBank", "accountNumber"],
  ["stationName", "stationAddress", "moisturePercent"],
];

export function ContractWizardForm() {
  const toast = useToast();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [highlightDirty, setHighlightDirty] = useState(false);
  const [paymentTermOptions, setPaymentTermOptions] = useState<string[]>(fallbackPaymentTerms);
  const [deliveryTermOptions, setDeliveryTermOptions] = useState<string[]>(fallbackDeliveryTerms);
  const [currencyOptions, setCurrencyOptions] = useState<string[]>(fallbackCurrencies);

  const {
    register,
    handleSubmit,
    getValues,
    trigger,
    setValue,
    reset,
    formState: { errors, isDirty, dirtyFields },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      currency: "USD",
      packagingUnit: "Bag of 60Kg",
      priceUnitForPrice: 100,
      priceUom: "Lbs",
      quality: "Specialty coffee",
      origin: "Ethiopia",
      grade: "G1",
      paymentTerm: fallbackPaymentTerms[0],
      deliveryTerm: fallbackDeliveryTerms[0],
      lastCertNo: 0,
    },
  });

  const lastSavedRef = useRef<Partial<FormData>>(getValues());

  useUnsavedChangesGuard({ enabled: isDirty && !isSaving, onBlockedNavigation: () => setHighlightDirty(true) });

  const isFieldDirty = useCallback(
    (name: keyof FormData) => Boolean((dirtyFields as Record<string, unknown>)[name]),
    [dirtyFields],
  );
  const dirtyControlClass = useCallback(
    (name: keyof FormData) => (highlightDirty && isFieldDirty(name) ? "field-error-control" : undefined),
    [highlightDirty, isFieldDirty],
  );

  function requiredLabelClass(hasError: boolean) {
    return hasError ? "is-required field-error" : "is-required";
  }

  useEffect(() => {
    let mounted = true;

    apiClient<CompanyConfiguration>(`/api/company-configuration?orgId=${DEFAULT_ORG_ID}`)
      .then((configuration) => {
        if (!mounted) {
          return;
        }

        const paymentTerms = configuration.paymentTerms?.filter((term) => term.trim().length > 0) ?? [];
        const deliveryTerms = configuration.deliveryTerms?.filter((term) => term.trim().length > 0) ?? [];
        const currencies = configuration.currencies?.filter((currency) => currency.trim().length > 0) ?? [];
        const effectivePaymentTerms = paymentTerms.length > 0 ? paymentTerms : fallbackPaymentTerms;
        const effectiveDeliveryTerms = deliveryTerms.length > 0 ? deliveryTerms : fallbackDeliveryTerms;
        const effectiveCurrencies = currencies.length > 0 ? currencies : fallbackCurrencies;

        setPaymentTermOptions(effectivePaymentTerms);
        setDeliveryTermOptions(effectiveDeliveryTerms);
        setCurrencyOptions(effectiveCurrencies);

        const currentPaymentTerm = (getValues("paymentTerm") ?? "").trim();
        if (!currentPaymentTerm || !effectivePaymentTerms.includes(currentPaymentTerm)) {
          setValue("paymentTerm", effectivePaymentTerms[0]);
        }

        const currentDeliveryTerm = (getValues("deliveryTerm") ?? "").trim();
        if (!currentDeliveryTerm || !effectiveDeliveryTerms.includes(currentDeliveryTerm)) {
          setValue("deliveryTerm", effectiveDeliveryTerms[0]);
        }

        const currentCurrency = (getValues("currency") ?? "").trim();
        if (!currentCurrency || !effectiveCurrencies.includes(currentCurrency)) {
          setValue("currency", effectiveCurrencies[0]);
        }
      })
      .catch(() => {
        if (mounted) {
          setPaymentTermOptions(fallbackPaymentTerms);
          setDeliveryTermOptions(fallbackDeliveryTerms);
          setCurrencyOptions(fallbackCurrencies);
        }
      });

    return () => {
      mounted = false;
    };
  }, [getValues, setValue]);

  const progress = useMemo(() => Math.round(((step + 1) / (stepFields.length + 1)) * 100), [step]);

  async function nextStep() {
    const currentFields = stepFields[step];
    const valid = await trigger(currentFields, { shouldFocus: true });
    if (!valid) {
      toast.error("Fill in the required fields.");
      return;
    }
    setStep((current) => Math.min(current + 1, stepFields.length));
  }

  async function save(values: FormData) {
    setApiError(null);
    setIsSaving(true);

    try {
      const data = await apiClient<{ contractId: string }>("/api/contracts", {
        method: "POST",
        body: JSON.stringify({
          orgId: DEFAULT_ORG_ID,
          customer: {
            name: values.customerName,
            address: values.customerAddress,
            country: values.customerCountry,
          },
          contract: {
            contractNumber: values.contractNumber,
            status: "draft",
            terms: {
              quality: values.quality,
              origin: values.origin,
              grade: values.grade,
              quantityBags: values.quantityBags,
              bagWeightKg: values.bagWeightKg,
              unitPrice: values.unitPrice,
              priceUnitForPrice: values.priceUnitForPrice,
              priceUom: values.priceUom,
              currency: values.currency,
              packagingUnit: values.packagingUnit,
              shipmentPeriod: values.shipmentPeriod,
              paymentTerm: values.paymentTerm,
              deliveryTerm: values.deliveryTerm,
              cropYear: values.cropYear,
              lastCertNo: values.lastCertNo,
            },
            shipping: {
              destinationPort: values.destinationPort,
              shippingLine: values.shippingLine,
              alternative1: values.alternative1,
              alternative2: values.alternative2,
              portOfLoading: values.portOfLoading,
              bagMarkings: values.bagMarkings,
              consignee: values.consignee,
              notifyParty: values.notifyParty,
              secondNotify: values.secondNotify,
              bookingNumber: values.bookingNumber,
            },
            banking: {
              beneficiaryBank: values.beneficiaryBank,
              accountNumber: values.accountNumber,
            },
            processing: {
              stationName: values.stationName,
              stationAddress: values.stationAddress,
              moisturePercent: values.moisturePercent,
            },
          },
        }),
      });

      toast.success("Contract saved.");
      lastSavedRef.current = values;
      setHighlightDirty(false);
      reset(values, { keepDirty: false, keepTouched: false });
      router.push(`/app/contracts/${encodeURIComponent(data.contractId)}`);
    } catch (error) {
      setApiError((error as Error).message);
      toast.error("Unable to save contract.");
    } finally {
      setIsSaving(false);
    }
  }

  function discardChanges() {
    reset(lastSavedRef.current as FormData, { keepDirty: false, keepTouched: false });
    setHighlightDirty(false);
    toast.info("Discarded unsaved changes.");
  }

  const common = (
    <>
      <label className={requiredLabelClass(Boolean(errors.contractNumber))}>
        <span className="label-text">Contract Number</span>
        <input className={dirtyControlClass("contractNumber")} {...register("contractNumber")} />
        <small>{errors.contractNumber?.message}</small>
      </label>
      <label className={requiredLabelClass(Boolean(errors.customerName))}>
        <span className="label-text">Buyer Name</span>
        <input className={dirtyControlClass("customerName")} {...register("customerName")} />
        <small>{errors.customerName?.message}</small>
      </label>
      <label className={requiredLabelClass(Boolean(errors.customerAddress))}>
        <span className="label-text">Buyer Address</span>
        <input className={dirtyControlClass("customerAddress")} {...register("customerAddress")} />
        <small>{errors.customerAddress?.message}</small>
      </label>
      <label className={requiredLabelClass(Boolean(errors.customerCountry))}>
        <span className="label-text">Buyer Country</span>
        <input className={dirtyControlClass("customerCountry")} {...register("customerCountry")} />
        <small>{errors.customerCountry?.message}</small>
      </label>
    </>
  );

  return (
    <form
      className="card form-grid"
      onSubmit={handleSubmit(save, () => toast.error("Fill in the required fields."))}
    >
      <div className="progress-wrap">
        <div className="progress-label">Step {step + 1} of {stepFields.length + 1}</div>
        <progress max={100} value={progress} />
      </div>

      {step === 0 && common}

      {step === 1 && (
        <>
          <label className={requiredLabelClass(Boolean(errors.quality))}>
            <span className="label-text">Quality</span>
            <input className={dirtyControlClass("quality")} {...register("quality")} />
            <small>{errors.quality?.message}</small>
          </label>
          <label className={requiredLabelClass(Boolean(errors.origin))}>
            <span className="label-text">Origin</span>
            <input className={dirtyControlClass("origin")} {...register("origin")} />
            <small>{errors.origin?.message}</small>
          </label>
          <label className={requiredLabelClass(Boolean(errors.grade))}>
            <span className="label-text">Grade</span>
            <input className={dirtyControlClass("grade")} {...register("grade")} />
            <small>{errors.grade?.message}</small>
          </label>
          <label className={requiredLabelClass(Boolean(errors.quantityBags))}>
            <span className="label-text">Quantity (Bags)</span>
            <input className={dirtyControlClass("quantityBags")} type="number" {...register("quantityBags", { valueAsNumber: true })} />
            <small>{errors.quantityBags?.message}</small>
          </label>
          <label className={requiredLabelClass(Boolean(errors.bagWeightKg))}>
            <span className="label-text">Bag Weight (kg)</span>
            <input
              className={dirtyControlClass("bagWeightKg")}
              type="number"
              step="0.001"
              {...register("bagWeightKg", { valueAsNumber: true })}
            />
            <small>{errors.bagWeightKg?.message}</small>
          </label>
          <label className={requiredLabelClass(Boolean(errors.unitPrice))}>
            <span className="label-text">Unit Price</span>
            <input className={dirtyControlClass("unitPrice")} type="number" step="0.01" {...register("unitPrice", { valueAsNumber: true })} />
            <small>{errors.unitPrice?.message}</small>
          </label>
          <label className={requiredLabelClass(Boolean(errors.priceUnitForPrice))}>
            <span className="label-text">Price Unit Base</span>
            <input
              className={dirtyControlClass("priceUnitForPrice")}
              type="number"
              step="1"
              {...register("priceUnitForPrice", { valueAsNumber: true })}
            />
            <small>{errors.priceUnitForPrice?.message}</small>
          </label>
          <label className={requiredLabelClass(Boolean(errors.priceUom))}>
            <span className="label-text">Price UoM</span>
            <input className={dirtyControlClass("priceUom")} {...register("priceUom")} />
            <small>{errors.priceUom?.message}</small>
          </label>
          <label className={requiredLabelClass(Boolean(errors.currency))}>
            <span className="label-text">Currency</span>
            <select className={dirtyControlClass("currency")} {...register("currency")}>
              <option value="">Select currency</option>
              {currencyOptions.map((currency) => (
                <option key={currency} value={currency}>{currency}</option>
              ))}
            </select>
            <small>{errors.currency?.message}</small>
          </label>
          <label className={requiredLabelClass(Boolean(errors.packagingUnit))}>
            <span className="label-text">Packaging Unit</span>
            <input className={dirtyControlClass("packagingUnit")} {...register("packagingUnit")} />
            <small>{errors.packagingUnit?.message}</small>
          </label>
          <label className={requiredLabelClass(Boolean(errors.paymentTerm))}>
            <span className="label-text">Payment Term</span>
            <select className={dirtyControlClass("paymentTerm")} {...register("paymentTerm")}>
              {paymentTermOptions.map((term) => (
                <option key={term} value={term}>{term}</option>
              ))}
            </select>
            <small>{errors.paymentTerm?.message}</small>
          </label>
          <label className={requiredLabelClass(Boolean(errors.deliveryTerm))}>
            <span className="label-text">Delivery Term</span>
            <select className={dirtyControlClass("deliveryTerm")} {...register("deliveryTerm")}>
              {deliveryTermOptions.map((term) => (
                <option key={term} value={term}>{term}</option>
              ))}
            </select>
            <small>{errors.deliveryTerm?.message}</small>
          </label>
          <label>
            Shipment Period
            <input className={dirtyControlClass("shipmentPeriod")} type="month" {...register("shipmentPeriod")} />
          </label>
          <label>
            Crop Year
            <input className={dirtyControlClass("cropYear")} {...register("cropYear")} />
          </label>
          <label className={requiredLabelClass(Boolean(errors.lastCertNo))}>
            <span className="label-text">Last Cert No</span>
            <input className={dirtyControlClass("lastCertNo")} type="number" step="1" {...register("lastCertNo", { valueAsNumber: true })} />
            <small>{errors.lastCertNo?.message}</small>
          </label>
        </>
      )}

      {step === 2 && (
        <>
          <label className={requiredLabelClass(Boolean(errors.destinationPort))}>
            <span className="label-text">Destination Port</span>
            <input className={dirtyControlClass("destinationPort")} {...register("destinationPort")} />
            <small>{errors.destinationPort?.message}</small>
          </label>
          <label className={requiredLabelClass(Boolean(errors.shippingLine))}>
            <span className="label-text">Shipping Line</span>
            <input className={dirtyControlClass("shippingLine")} {...register("shippingLine")} />
            <small>{errors.shippingLine?.message}</small>
          </label>
          <label className={requiredLabelClass(Boolean(errors.portOfLoading))}>
            <span className="label-text">Port of Loading</span>
            <input className={dirtyControlClass("portOfLoading")} {...register("portOfLoading")} />
            <small>{errors.portOfLoading?.message}</small>
          </label>
          <label>
            Bag Markings
            <input className={dirtyControlClass("bagMarkings")} {...register("bagMarkings")} />
          </label>
          <label>
            Alternative 1
            <input className={dirtyControlClass("alternative1")} {...register("alternative1")} />
          </label>
          <label>
            Alternative 2
            <input className={dirtyControlClass("alternative2")} {...register("alternative2")} />
          </label>
          <label>
            Consignee
            <input className={dirtyControlClass("consignee")} {...register("consignee")} />
          </label>
          <label>
            Notify Party
            <input className={dirtyControlClass("notifyParty")} {...register("notifyParty")} />
          </label>
          <label>
            2nd Notify
            <input className={dirtyControlClass("secondNotify")} {...register("secondNotify")} />
          </label>
          <label>
            Booking Number
            <input className={dirtyControlClass("bookingNumber")} {...register("bookingNumber")} />
          </label>
        </>
      )}

      {step === 3 && (
        <>
          <label className={requiredLabelClass(Boolean(errors.beneficiaryBank))}>
            <span className="label-text">Beneficiary Bank</span>
            <input className={dirtyControlClass("beneficiaryBank")} {...register("beneficiaryBank")} />
            <small>{errors.beneficiaryBank?.message}</small>
          </label>
          <label className={requiredLabelClass(Boolean(errors.accountNumber))}>
            <span className="label-text">Account Number</span>
            <input className={dirtyControlClass("accountNumber")} {...register("accountNumber")} />
            <small>{errors.accountNumber?.message}</small>
          </label>
        </>
      )}

      {step === 4 && (
        <>
          <label className={requiredLabelClass(Boolean(errors.stationName))}>
            <span className="label-text">Station Name</span>
            <input className={dirtyControlClass("stationName")} {...register("stationName")} />
            <small>{errors.stationName?.message}</small>
          </label>
          <label className={requiredLabelClass(Boolean(errors.stationAddress))}>
            <span className="label-text">Station Address</span>
            <input className={dirtyControlClass("stationAddress")} {...register("stationAddress")} />
            <small>{errors.stationAddress?.message}</small>
          </label>
          <label className={requiredLabelClass(Boolean(errors.moisturePercent))}>
            <span className="label-text">Moisture (%)</span>
            <input
              className={dirtyControlClass("moisturePercent")}
              type="number"
              step="0.01"
              {...register("moisturePercent", { valueAsNumber: true })}
            />
            <small>{errors.moisturePercent?.message}</small>
          </label>
        </>
      )}

      {step === stepFields.length && (
        <div className="review-box">
          <h3>Review and Submit</h3>
          <p>This saves contract and buyer data as draft records.</p>
          {apiError ? <p className="error-text">{apiError}</p> : null}
          <button type="submit" disabled={isSaving}>{isSaving ? "Saving..." : "Save Draft"}</button>
        </div>
      )}

      <div className="row-actions">
        <button type="button" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          Back
        </button>
        <button type="button" className="button-secondary" onClick={discardChanges} disabled={!isDirty || isSaving}>
          Discard changes
        </button>
        {step < stepFields.length ? (
          <button type="button" onClick={nextStep}>Next</button>
        ) : null}
      </div>
    </form>
  );
}

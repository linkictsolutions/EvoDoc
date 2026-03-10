"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiClient } from "@/lib/api/client";
import { DEFAULT_ORG_ID } from "@/lib/config";

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
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const {
    register,
    handleSubmit,
    trigger,
    formState: { errors },
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
      paymentTerm: "CAD",
      deliveryTerm: "F.O.B",
      lastCertNo: 0,
    },
  });

  const progress = useMemo(() => Math.round(((step + 1) / (stepFields.length + 1)) * 100), [step]);

  async function nextStep() {
    const currentFields = stepFields[step];
    const valid = await trigger(currentFields, { shouldFocus: true });
    if (valid) {
      setStep((current) => Math.min(current + 1, stepFields.length));
    }
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

      router.push(`/app/contracts/${data.contractId}`);
    } catch (error) {
      setApiError((error as Error).message);
    } finally {
      setIsSaving(false);
    }
  }

  const common = (
    <>
      <label>
        Contract Number
        <input {...register("contractNumber")} />
        <small>{errors.contractNumber?.message}</small>
      </label>
      <label>
        Customer Name
        <input {...register("customerName")} />
        <small>{errors.customerName?.message}</small>
      </label>
      <label>
        Customer Address
        <input {...register("customerAddress")} />
        <small>{errors.customerAddress?.message}</small>
      </label>
      <label>
        Customer Country
        <input {...register("customerCountry")} />
        <small>{errors.customerCountry?.message}</small>
      </label>
    </>
  );

  return (
    <form className="card form-grid" onSubmit={handleSubmit(save)}>
      <div className="progress-wrap">
        <div className="progress-label">Step {step + 1} of {stepFields.length + 1}</div>
        <progress max={100} value={progress} />
      </div>

      {step === 0 && common}

      {step === 1 && (
        <>
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
            Quantity (Bags)
            <input type="number" {...register("quantityBags", { valueAsNumber: true })} />
          </label>
          <label>
            Bag Weight (kg)
            <input
              type="number"
              step="0.001"
              {...register("bagWeightKg", { valueAsNumber: true })}
            />
          </label>
          <label>
            Unit Price
            <input type="number" step="0.01" {...register("unitPrice", { valueAsNumber: true })} />
          </label>
          <label>
            Price Unit Base
            <input
              type="number"
              step="1"
              {...register("priceUnitForPrice", { valueAsNumber: true })}
            />
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
            Packaging Unit
            <input {...register("packagingUnit")} />
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
            Shipment Period
            <input {...register("shipmentPeriod")} />
          </label>
          <label>
            Crop Year
            <input {...register("cropYear")} />
          </label>
          <label>
            Last Cert No
            <input type="number" step="1" {...register("lastCertNo", { valueAsNumber: true })} />
          </label>
        </>
      )}

      {step === 2 && (
        <>
          <label>
            Destination Port
            <input {...register("destinationPort")} />
          </label>
          <label>
            Shipping Line
            <input {...register("shippingLine")} />
          </label>
          <label>
            Port of Loading
            <input {...register("portOfLoading")} />
          </label>
          <label>
            Bag Markings
            <input {...register("bagMarkings")} />
          </label>
          <label>
            Alternative 1
            <input {...register("alternative1")} />
          </label>
          <label>
            Alternative 2
            <input {...register("alternative2")} />
          </label>
          <label>
            Consignee
            <input {...register("consignee")} />
          </label>
          <label>
            Notify Party
            <input {...register("notifyParty")} />
          </label>
          <label>
            2nd Notify
            <input {...register("secondNotify")} />
          </label>
          <label>
            Booking Number
            <input {...register("bookingNumber")} />
          </label>
        </>
      )}

      {step === 3 && (
        <>
          <label>
            Beneficiary Bank
            <input {...register("beneficiaryBank")} />
          </label>
          <label>
            Account Number
            <input {...register("accountNumber")} />
          </label>
        </>
      )}

      {step === 4 && (
        <>
          <label>
            Station Name
            <input {...register("stationName")} />
          </label>
          <label>
            Station Address
            <input {...register("stationAddress")} />
          </label>
          <label>
            Moisture (%)
            <input
              type="number"
              step="0.01"
              {...register("moisturePercent", { valueAsNumber: true })}
            />
          </label>
        </>
      )}

      {step === stepFields.length && (
        <div className="review-box">
          <h3>Review and Submit</h3>
          <p>This saves contract and customer data as draft records.</p>
          {apiError ? <p className="error-text">{apiError}</p> : null}
          <button type="submit" disabled={isSaving}>{isSaving ? "Saving..." : "Save Draft"}</button>
        </div>
      )}

      <div className="row-actions">
        <button type="button" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          Back
        </button>
        {step < stepFields.length ? (
          <button type="button" onClick={nextStep}>Next</button>
        ) : null}
      </div>
    </form>
  );
}

"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AttachmentsField } from "@/components/ui/attachments";
import { CenteredLoader } from "@/components/ui/centered-loader";
import { useToast } from "@/components/ui/toast";
import { useUnsavedChangesGuard } from "@/components/ui/use-unsaved-changes-guard";
import { apiClient } from "@/lib/api/client";
import { DEFAULT_ORG_ID } from "@/lib/config";
import type { AttachmentRef, Contract } from "@/types/models";

const schema = z.object({
  contractId: z.string().min(1, "Contract number is required"),
  billType: z.enum(["ORIGINAL BILL No.", "WAYBILL No."]),
  billNo: z.string().optional(),
  noOfCopyBills: z.string().optional(),
  shipperReferenceType: z.enum(["Booking Ref", "Shipper Ref."]),
  shipperReferenceValue: z.string().optional(),
  placeOfReceipt: z.string().optional(),
  placeOfDelivery: z.string().optional(),
  shippedOnBoardDate: z.string().optional(),
  placeAndDateOfIssue: z.string().optional(),
  carrierAgentsEndorsements: z.string().optional(),
  notify2: z.string().optional(),
  notify3: z.string().optional(),
  declaredValue: z.string().optional(),
  freightAndChargesText: z.string().optional(),
  measurement: z.string().optional(),
  descriptionOverride: z.string().optional(),
  riderDescriptionsText: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface BillOfLadingFormProps {
  initialContractId?: string;
  autoLoadExisting?: boolean;
  continueHref?: string;
}

interface ContractDetailResponse {
  contract: Contract;
  sourceInputs?: Array<{ id: string; sourceType?: string; payload?: unknown }>;
}

function toDateInputValue(value?: string): string {
  const normalized = value?.trim();
  if (!normalized) {
    return "";
  }

  const isoDateMatch = normalized.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoDateMatch) {
    return isoDateMatch[1];
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toISOString().slice(0, 10);
}

function serializeRiderDescriptions(value?: string[]): string {
  return (value ?? []).filter(Boolean).join("\n\n");
}

function parseRiderDescriptions(value?: string): string[] {
  return (value ?? "")
    .split(/\n\s*\n/g)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

export function BillOfLadingForm({
  initialContractId,
  autoLoadExisting = false,
  continueHref,
}: BillOfLadingFormProps) {
  const toast = useToast();
  const [apiError, setApiError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedContractId, setSavedContractId] = useState<string | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentRef[]>([]);
  const [highlightDirty, setHighlightDirty] = useState(false);
  const lastSavedRef = useRef<{ form: Partial<FormData>; attachments: AttachmentRef[] }>({ form: {}, attachments: [] });

  const {
    register,
    watch,
    setValue,
    reset,
    handleSubmit,
    formState: { errors, isDirty, dirtyFields },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      contractId: "",
      billType: "ORIGINAL BILL No.",
      billNo: "",
      noOfCopyBills: "3",
      shipperReferenceType: "Booking Ref",
      shipperReferenceValue: "",
      placeOfReceipt: "",
      placeOfDelivery: "",
      shippedOnBoardDate: "",
      placeAndDateOfIssue: "",
      carrierAgentsEndorsements: "",
      notify2: "",
      notify3: "",
      declaredValue: "",
      freightAndChargesText: "",
      measurement: "",
      descriptionOverride: "",
      riderDescriptionsText: "",
    },
  });

  useUnsavedChangesGuard({ enabled: isDirty && !saving, onBlockedNavigation: () => setHighlightDirty(true) });

  const contractIdInput = watch("contractId");
  const nextHref = useMemo(() => {
    if (continueHref) {
      return continueHref;
    }
    const id = savedContractId ?? contractIdInput;
    return id ? `/app/contracts/${encodeURIComponent(id)}/resolved-values` : "/app/contracts";
  }, [contractIdInput, continueHref, savedContractId]);

  const isFieldDirty = useCallback(
    (name: keyof FormData) => Boolean((dirtyFields as Record<string, unknown>)[name]),
    [dirtyFields],
  );
  const dirtyControlClass = useCallback(
    (name: keyof FormData) => (highlightDirty && isFieldDirty(name) ? "field-error-control" : undefined),
    [highlightDirty, isFieldDirty],
  );

  useEffect(() => {
    const queryContractId = initialContractId ?? (typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("contractId")
      : null);
    const rememberedContractId =
      typeof window !== "undefined" ? window.localStorage.getItem("evodoc.contractId") : null;
    const resolvedContractId = queryContractId ?? rememberedContractId;

    if (resolvedContractId) {
      setValue("contractId", resolvedContractId, { shouldValidate: true });
    }
  }, [initialContractId, setValue]);

  useEffect(() => {
    const targetContractId = initialContractId ?? contractIdInput;
    if (!autoLoadExisting || !targetContractId) {
      return;
    }

    let mounted = true;
    setLoadingExisting(true);
    setApiError(null);

    apiClient<ContractDetailResponse>(`/api/contracts/${targetContractId}?orgId=${DEFAULT_ORG_ID}`)
      .then((data) => {
        if (!mounted) {
          return;
        }

        const bill = data.contract.billOfLading ?? {};
        const contractIdentifier = data.contract.contractNumber;
        const source = data.sourceInputs?.find(
          (input) => input.id === "bill_of_lading_sheet" || input.sourceType === "bill_of_lading_sheet",
        );
        const storedAttachments = (source?.payload as { attachments?: AttachmentRef[] } | undefined)?.attachments ?? [];
        const nextAttachments = Array.isArray(storedAttachments) ? storedAttachments : [];
        setAttachments(nextAttachments);
        setSavedContractId(contractIdentifier);

        const nextForm: FormData = {
          contractId: contractIdentifier,
          billType: bill.billType ?? "ORIGINAL BILL No.",
          billNo: bill.billNo ?? "",
          noOfCopyBills: bill.noOfCopyBills ?? "3",
          shipperReferenceType: bill.shipperReferenceType ?? "Booking Ref",
          shipperReferenceValue: bill.shipperReferenceValue ?? "",
          placeOfReceipt: bill.placeOfReceipt ?? "",
          placeOfDelivery: bill.placeOfDelivery ?? "",
          shippedOnBoardDate: toDateInputValue(bill.shippedOnBoardDate),
          placeAndDateOfIssue: bill.placeAndDateOfIssue ?? "",
          carrierAgentsEndorsements: bill.carrierAgentsEndorsements ?? "",
          notify2: bill.notify2 ?? "",
          notify3: bill.notify3 ?? "",
          declaredValue: bill.declaredValue ?? "",
          freightAndChargesText: bill.freightAndChargesText ?? "",
          measurement: bill.measurement ?? "",
          descriptionOverride: bill.descriptionOverride ?? "",
          riderDescriptionsText: serializeRiderDescriptions(bill.riderDescriptions),
        };

        reset(nextForm, { keepDirty: false, keepTouched: false });
        lastSavedRef.current = { form: nextForm, attachments: nextAttachments };
        setHighlightDirty(false);
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
  }, [autoLoadExisting, contractIdInput, initialContractId, reset]);

  function discardChanges() {
    const snapshot = lastSavedRef.current;
    if (snapshot.form) {
      reset(snapshot.form as FormData, { keepDirty: false, keepTouched: false });
    }
    setAttachments(snapshot.attachments ?? []);
    setHighlightDirty(false);
    toast.info("Discarded unsaved changes.");
  }

  async function onSubmit(form: FormData) {
    setSaving(true);
    setApiError(null);

    try {
      const result = await apiClient<{ contractId: string }>("/api/contracts/bill-of-lading", {
        method: "POST",
        body: JSON.stringify({
          orgId: DEFAULT_ORG_ID,
          contractId: form.contractId,
          attachments,
          billOfLading: {
            billType: form.billType,
            billNo: form.billNo,
            noOfCopyBills: form.noOfCopyBills,
            shipperReferenceType: form.shipperReferenceType,
            shipperReferenceValue: form.shipperReferenceValue,
            placeOfReceipt: form.placeOfReceipt,
            placeOfDelivery: form.placeOfDelivery,
            shippedOnBoardDate: form.shippedOnBoardDate,
            placeAndDateOfIssue: form.placeAndDateOfIssue,
            carrierAgentsEndorsements: form.carrierAgentsEndorsements,
            notify2: form.notify2,
            notify3: form.notify3,
            declaredValue: form.declaredValue,
            freightAndChargesText: form.freightAndChargesText,
            measurement: form.measurement,
            descriptionOverride: form.descriptionOverride,
            riderDescriptions: parseRiderDescriptions(form.riderDescriptionsText),
          },
        }),
      });

      setSavedContractId(result.contractId);
      lastSavedRef.current = { form, attachments };
      setHighlightDirty(false);
      reset(form, { keepDirty: false, keepTouched: false });
      toast.success("Bill of lading saved.");
      if (typeof window !== "undefined") {
        window.localStorage.setItem("evodoc.contractId", result.contractId);
      }
    } catch (error) {
      setApiError((error as Error).message);
      toast.error("Unable to save bill of lading.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="page-shell">
      <header className="page-header">
        <h1>Bill of Lading Source Document</h1>
        <p>Capture MSC bill-of-lading-specific overrides used during generation.</p>
        {loadingExisting ? <CenteredLoader label="Loading existing bill of lading data..." scope="inline" /> : null}
      </header>

      <form
        className="card form-grid"
        onSubmit={handleSubmit(onSubmit, () => toast.error("Fill in the required fields."))}
      >
        <h3 className="span-all">Contract Link</h3>
        <label className={errors.contractId ? "is-required field-error" : "is-required"}>
          <span className="label-text">Contract Number (link only)</span>
          <input className={dirtyControlClass("contractId")} {...register("contractId")} readOnly={Boolean(initialContractId)} />
          <small>{errors.contractId?.message}</small>
        </label>

        <AttachmentsField
          orgId={DEFAULT_ORG_ID}
          contractId={savedContractId ?? contractIdInput ?? "draft"}
          stage="bill_of_lading_sheet"
          value={attachments}
          onChange={setAttachments}
          helperText="Attach carrier drafts, booking confirmations, or B/L support files."
        />

        <h3 className="span-all">Bill Meta</h3>
        <label>
          Bill Type
          <select className={dirtyControlClass("billType")} {...register("billType")}>
            <option value="ORIGINAL BILL No.">ORIGINAL BILL No.</option>
            <option value="WAYBILL No.">WAYBILL No.</option>
          </select>
        </label>
        <label>
          Bill No.
          <input className={dirtyControlClass("billNo")} {...register("billNo")} />
        </label>
        <label>
          No. of Copy Bills
          <input className={dirtyControlClass("noOfCopyBills")} {...register("noOfCopyBills")} />
        </label>
        <label>
          Reference Type
          <select className={dirtyControlClass("shipperReferenceType")} {...register("shipperReferenceType")}>
            <option value="Booking Ref">Booking Ref</option>
            <option value="Shipper Ref.">Shipper Ref.</option>
          </select>
        </label>
        <label>
          Reference Value
          <input className={dirtyControlClass("shipperReferenceValue")} {...register("shipperReferenceValue")} />
        </label>

        <h3 className="span-all">Routing Overrides</h3>
        <label>
          Place of Receipt
          <input className={dirtyControlClass("placeOfReceipt")} {...register("placeOfReceipt")} />
        </label>
        <label>
          Place of Delivery
          <input className={dirtyControlClass("placeOfDelivery")} {...register("placeOfDelivery")} />
        </label>
        <label>
          Shipped on Board Date
          <input className={dirtyControlClass("shippedOnBoardDate")} type="date" {...register("shippedOnBoardDate")} />
        </label>
        <label>
          Place and Date of Issue
          <input className={dirtyControlClass("placeAndDateOfIssue")} {...register("placeAndDateOfIssue")} />
        </label>

        <h3 className="span-all">Party Overrides</h3>
        <label className="span-all">
          Carrier&apos;s Agents Endorsements
          <textarea className={dirtyControlClass("carrierAgentsEndorsements")} rows={4} {...register("carrierAgentsEndorsements")} />
        </label>
        <label>
          Notify 2
          <textarea className={dirtyControlClass("notify2")} rows={3} {...register("notify2")} />
        </label>
        <label>
          Notify 3
          <textarea className={dirtyControlClass("notify3")} rows={3} {...register("notify3")} />
        </label>

        <h3 className="span-all">Cargo and Freight Overrides</h3>
        <label>
          Declared Value
          <input className={dirtyControlClass("declaredValue")} {...register("declaredValue")} />
        </label>
        <label>
          Measurement
          <input className={dirtyControlClass("measurement")} {...register("measurement")} />
        </label>
        <label className="span-all">
          Freight and Charges Text
          <textarea className={dirtyControlClass("freightAndChargesText")} rows={4} {...register("freightAndChargesText")} />
        </label>
        <label className="span-all">
          Description Override
          <textarea className={dirtyControlClass("descriptionOverride")} rows={5} {...register("descriptionOverride")} />
        </label>
        <label className="span-all">
          Rider Descriptions
          <textarea
            className={dirtyControlClass("riderDescriptionsText")}
            rows={6}
            {...register("riderDescriptionsText")}
          />
          <small>Separate rider-page paragraphs with a blank line.</small>
        </label>

        <div className="row-actions">
          <button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Bill of Lading"}</button>
          <button type="button" className="button-secondary" disabled={!isDirty || saving} onClick={discardChanges}>
            Discard changes
          </button>
          <Link href={nextHref}>
            <button type="button" className="button-secondary">Continue</button>
          </Link>
        </div>

        {apiError ? <p className="error-text span-all">{apiError}</p> : null}
      </form>
    </section>
  );
}

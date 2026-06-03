"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { apiClient } from "@/lib/api/client";
import { DEFAULT_ORG_ID } from "@/lib/config";
import type { AttachmentRef, CompanyConfiguration, Contract } from "@/types/models";
import { CenteredLoader } from "@/components/ui/centered-loader";
import { AttachmentsField } from "@/components/ui/attachments";
import { useToast } from "@/components/ui/toast";
import { useUnsavedChangesGuard } from "@/components/ui/use-unsaved-changes-guard";

const schema = z.object({
  contractId: z.string().min(1, "Contract number is required"),
  destinationPort: z.string().min(1, "Destination is required"),
  shippingLine: z.string().min(1, "Shipping line is required"),
  serviceContract: z.string().optional(),
  alternative1: z.string().optional(),
  alternative1ServiceContract: z.string().optional(),
  alternative2: z.string().optional(),
  alternative2ServiceContract: z.string().optional(),
  portOfLoading: z.string().min(1, "Port of loading is required"),
  quantityValue: z.string().min(1, "Quantity is required"),
  qualityValue: z.string().min(1, "Quality is required"),
  packagingValue: z.string().min(1, "Packaging is required"),
  noOfBagsValue: z.string().min(1, "No of bags is required"),
  containerCountValue: z.string().min(1, "Containers is required"),
  shipmentMonth: z.string().optional(),
  bagMarkings: z.string().optional(),
  description: z.string().optional(),
  consignee: z.string().optional(),
  notifyParty: z.string().optional(),
  secondNotify: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface ShippingInstructionFormProps {
  initialContractId?: string;
  autoLoadExisting?: boolean;
  continueHref?: string;
}

interface ContractDetailResponse {
  contract: Contract;
  sourceInputs?: Array<{ id: string; sourceType?: string; payload?: unknown }>;
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

export function ShippingInstructionForm({
  initialContractId,
  autoLoadExisting = false,
  continueHref,
}: ShippingInstructionFormProps) {
  const toast = useToast();
  const [apiError, setApiError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedContractId, setSavedContractId] = useState<string | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [packagingOptions, setPackagingOptions] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<AttachmentRef[]>([]);
  const [highlightDirty, setHighlightDirty] = useState(false);
  const lastSavedRef = useRef<{ form: Partial<FormData>; attachments: AttachmentRef[] }>({ form: {}, attachments: [] });

  const {
    register,
    setValue,
    watch,
    reset,
    handleSubmit,
    formState: { errors, isDirty, dirtyFields },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      contractId: "",
      destinationPort: "",
      shippingLine: "",
      serviceContract: "",
      alternative1: "",
      alternative1ServiceContract: "",
      alternative2: "",
      alternative2ServiceContract: "",
      portOfLoading: "",
      quantityValue: "",
      qualityValue: "",
      packagingValue: "",
      noOfBagsValue: "",
      containerCountValue: "",
      shipmentMonth: "",
      bagMarkings: "",
      description: "",
      consignee: "",
      notifyParty: "",
      secondNotify: "",
    },
  });

  const contractIdInput = watch("contractId");
  const selectedPackagingValue = watch("packagingValue");

  useUnsavedChangesGuard({ enabled: isDirty && !saving, onBlockedNavigation: () => setHighlightDirty(true) });

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

  const bankLcHref = useMemo(() => {
    if (continueHref) {
      return continueHref;
    }
    const id = savedContractId ?? contractIdInput;
    return id ? `/app/contracts/${encodeURIComponent(id)}/inputs/bank-lc` : "/app/contracts";
  }, [contractIdInput, continueHref, savedContractId]);

  useEffect(() => {
    const queryContractId = initialContractId ?? (typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("contractId")
      : null);
    const rememberedContractId =
      typeof window !== "undefined" ? window.localStorage.getItem("evodoc.contractId") : null;
    const resolvedContractId = queryContractId ?? rememberedContractId;

    if (!resolvedContractId) {
      return;
    }

    setValue("contractId", resolvedContractId, { shouldValidate: true });
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

        const shipping = data.contract.shipping;
        const contractIdentifier = data.contract.contractNumber;
        const shippingSource = data.sourceInputs?.find(
          (input) => input.id === "shipping_instruction_sheet" || input.sourceType === "shipping_instruction_sheet",
        );
        const storedAttachments = (shippingSource?.payload as { attachments?: AttachmentRef[] } | undefined)?.attachments ?? [];
        setAttachments(Array.isArray(storedAttachments) ? storedAttachments : []);
        setSavedContractId(contractIdentifier);
        const nextForm: FormData = {
            contractId: contractIdentifier,
            destinationPort: shipping.destinationPort ?? "",
            shippingLine: shipping.shippingLine ?? "",
            serviceContract: shipping.serviceContract ?? "",
            alternative1: shipping.alternative1 ?? "",
            alternative1ServiceContract: shipping.alternative1ServiceContract ?? "",
            alternative2: shipping.alternative2 ?? "",
            alternative2ServiceContract: shipping.alternative2ServiceContract ?? "",
            portOfLoading: shipping.portOfLoading ?? "",
            quantityValue: shipping.quantityValue ?? "",
            qualityValue: shipping.qualityValue ?? "",
            packagingValue: shipping.packagingValue ?? "",
            noOfBagsValue: shipping.noOfBagsValue ?? "",
            containerCountValue: shipping.containerCountValue ?? "",
            shipmentMonth: toMonthInputValue(shipping.shipmentMonth),
            bagMarkings: shipping.bagMarkings ?? "",
            description: shipping.description ?? "",
            consignee: shipping.consignee ?? "",
            notifyParty: shipping.notifyParty ?? "",
            secondNotify: shipping.secondNotify ?? "",
        };
        reset(nextForm, { keepDirty: false, keepTouched: false });
        lastSavedRef.current = { form: nextForm, attachments: Array.isArray(storedAttachments) ? storedAttachments : [] };
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

  useEffect(() => {
    let mounted = true;
    apiClient<CompanyConfiguration>(`/api/company-configuration?orgId=${DEFAULT_ORG_ID}`)
      .then((configuration) => {
        if (!mounted) {
          return;
        }
        const units = configuration.packagingUnits?.filter((unit) => unit.trim().length > 0) ?? [];
        setPackagingOptions(units);
      })
      .catch(() => {
        if (mounted) {
          setPackagingOptions([]);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  function discardChanges() {
    const snapshot = lastSavedRef.current;
    if (snapshot?.form) {
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
      const result = await apiClient<{ contractId: string }>("/api/contracts/shipping", {
        method: "POST",
        body: JSON.stringify({
          orgId: DEFAULT_ORG_ID,
          contractId: form.contractId,
          attachments,
          shipping: {
            destinationPort: form.destinationPort,
            shippingLine: form.shippingLine,
            serviceContract: form.serviceContract,
            alternative1: form.alternative1,
            alternative1ServiceContract: form.alternative1ServiceContract,
            alternative2: form.alternative2,
            alternative2ServiceContract: form.alternative2ServiceContract,
            portOfLoading: form.portOfLoading,
            quantityValue: form.quantityValue,
            qualityValue: form.qualityValue,
            packagingValue: form.packagingValue,
            noOfBagsValue: form.noOfBagsValue,
            containerCountValue: form.containerCountValue,
            shipmentMonth: form.shipmentMonth,
            bagMarkings: form.bagMarkings,
            description: form.description,
            consignee: form.consignee,
            notifyParty: form.notifyParty,
            secondNotify: form.secondNotify,
          },
        }),
      });

      setSavedContractId(result.contractId);
      lastSavedRef.current = { form, attachments };
      setHighlightDirty(false);
      reset(form, { keepDirty: false, keepTouched: false });
      toast.success("Shipping instruction saved.");
      if (typeof window !== "undefined") {
        window.localStorage.setItem("evodoc.contractId", result.contractId);
      }
    } catch (error) {
      setApiError((error as Error).message);
      toast.error("Unable to save shipping instruction.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="page-shell">
      <header className="page-header">
        <h1>Shipping Instruction Source Document</h1>
        <p>
          {autoLoadExisting
            ? "Loads existing shipping details for editing."
            : "Create and maintain shipping details for this contract."}
        </p>
        {loadingExisting ? <CenteredLoader label="Loading existing shipping data..." scope="inline" /> : null}
      </header>

      <form
        className="card form-grid"
        onSubmit={handleSubmit(onSubmit, () => toast.error("Fill in the required fields."))}
      >
        <h3 className="span-all">Contract Link</h3>
        <label className={requiredLabelClass(Boolean(errors.contractId))}>
          <span className="label-text">Contract Number (link only, no auto-fill)</span>
          <input className={dirtyControlClass("contractId")} {...register("contractId")} readOnly={Boolean(initialContractId)} />
          <small>{errors.contractId?.message}</small>
        </label>

        <AttachmentsField
          orgId={DEFAULT_ORG_ID}
          contractId={savedContractId ?? contractIdInput ?? "draft"}
          stage="shipping_instruction_sheet"
          value={attachments}
          onChange={setAttachments}
          helperText="Attach supporting shipping instruction documents (multiple files allowed)."
        />

        <h3 className="span-all">Route and Carrier</h3>
        <label className={requiredLabelClass(Boolean(errors.destinationPort))}>
          <span className="label-text">Destination (Port, Country)</span>
          <input className={dirtyControlClass("destinationPort")} {...register("destinationPort")} />
          <small>{errors.destinationPort?.message}</small>
        </label>
        <label className={requiredLabelClass(Boolean(errors.portOfLoading))}>
          <span className="label-text">Port of Loading</span>
          <input className={dirtyControlClass("portOfLoading")} {...register("portOfLoading")} />
          <small>{errors.portOfLoading?.message}</small>
        </label>
        <label className={requiredLabelClass(Boolean(errors.shippingLine))}>
          <span className="label-text">Shipping Line</span>
          <input className={dirtyControlClass("shippingLine")} {...register("shippingLine")} />
          <small>{errors.shippingLine?.message}</small>
        </label>
        <label>
          Service Contract
          <input className={dirtyControlClass("serviceContract")} {...register("serviceContract")} />
        </label>
        <label>
          Alternative 1
          <input className={dirtyControlClass("alternative1")} {...register("alternative1")} />
        </label>
        <label>
          Alternative 1 Service Contract
          <input className={dirtyControlClass("alternative1ServiceContract")} {...register("alternative1ServiceContract")} />
        </label>
        <label>
          Alternative 2
          <input className={dirtyControlClass("alternative2")} {...register("alternative2")} />
        </label>
        <label>
          Alternative 2 Service Contract
          <input className={dirtyControlClass("alternative2ServiceContract")} {...register("alternative2ServiceContract")} />
        </label>

        <h3 className="span-all">Cargo Details</h3>
        <label className={requiredLabelClass(Boolean(errors.quantityValue))}>
          <span className="label-text">Quantity</span>
          <input className={dirtyControlClass("quantityValue")} {...register("quantityValue")} />
          <small>{errors.quantityValue?.message}</small>
        </label>
        <label className={requiredLabelClass(Boolean(errors.qualityValue))}>
          <span className="label-text">Quality</span>
          <textarea className={dirtyControlClass("qualityValue")} rows={3} {...register("qualityValue")} />
          <small>{errors.qualityValue?.message}</small>
        </label>
        <label className={requiredLabelClass(Boolean(errors.packagingValue))}>
          <span className="label-text">Packaging</span>
          <select className={dirtyControlClass("packagingValue")} {...register("packagingValue")}>
            <option value="">Select packaging</option>
            {selectedPackagingValue && !packagingOptions.includes(selectedPackagingValue) ? (
              <option value={selectedPackagingValue}>{selectedPackagingValue}</option>
            ) : null}
            {packagingOptions.map((unit) => (
              <option key={unit} value={unit}>{unit}</option>
            ))}
          </select>
          <small>{errors.packagingValue?.message}</small>
        </label>
        <label className={requiredLabelClass(Boolean(errors.noOfBagsValue))}>
          <span className="label-text">Number of Bags</span>
          <input className={dirtyControlClass("noOfBagsValue")} {...register("noOfBagsValue")} />
          <small>{errors.noOfBagsValue?.message}</small>
        </label>
        <label className={requiredLabelClass(Boolean(errors.containerCountValue))}>
          <span className="label-text">Containers</span>
          <input className={dirtyControlClass("containerCountValue")} {...register("containerCountValue")} />
          <small>{errors.containerCountValue?.message}</small>
        </label>
        <label>
          Shipment Month
          <input className={dirtyControlClass("shipmentMonth")} type="month" {...register("shipmentMonth")} />
        </label>
        <label>
          Bag Marking
          <textarea className={dirtyControlClass("bagMarkings")} rows={6} {...register("bagMarkings")} />
        </label>
        <label>
          Description
          <textarea className={dirtyControlClass("description")} rows={8} {...register("description")} />
        </label>

        <h3 className="span-all">Consignee and Notify Parties</h3>
        <label>
          Consignee
          <textarea className={dirtyControlClass("consignee")} rows={3} {...register("consignee")} />
        </label>
        <label>
          Notify
          <textarea className={dirtyControlClass("notifyParty")} rows={3} {...register("notifyParty")} />
        </label>
        <label>
          2nd Notify
          <textarea className={dirtyControlClass("secondNotify")} rows={3} {...register("secondNotify")} />
        </label>

        <div className="row-actions">
          <button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Shipping Instruction"}</button>
          <button type="button" className="button-secondary" disabled={!isDirty || saving} onClick={discardChanges}>
            Discard changes
          </button>
          <Link href={bankLcHref}>
            <button type="button" className="button-secondary">Continue to Bank & LC</button>
          </Link>
        </div>
        {savedContractId ? <p>Saved to Contract ID: {savedContractId}</p> : null}
        {apiError ? <p className="error-text">{apiError}</p> : null}
      </form>
    </section>
  );
}

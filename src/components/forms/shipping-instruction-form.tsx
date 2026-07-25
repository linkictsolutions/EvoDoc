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
import { FormActionBar } from "@/components/ui/form-action-bar";
import { FormSection } from "@/components/ui/form-section";
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
  qualityValue: z.string().min(1, "Coffee type is required"),
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

import { toDateInputValue } from "@/domain/date-format";

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
  const [shippingLineOptions, setShippingLineOptions] = useState<string[]>([]);
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
  const selectedShippingLine = watch("shippingLine");

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
            shipmentMonth: toDateInputValue(shipping.shipmentMonth),
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
        const units = (configuration.packagingUnits ?? [])
          .map((unit) => (typeof unit === "string" ? unit : unit.label))
          .map((unit) => unit.trim())
          .filter(Boolean);
        setPackagingOptions(units);
        setShippingLineOptions(configuration.shippingLines?.filter((line) => line.trim().length > 0) ?? []);
      })
      .catch(() => {
        if (mounted) {
          setPackagingOptions([]);
          setShippingLineOptions([]);
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
      {loadingExisting ? <CenteredLoader label="Loading existing shipping data..." scope="inline" /> : null}

      <form
        className="form-workspace"
        onSubmit={handleSubmit(onSubmit, () => toast.error("Fill in the required fields."))}
      >
        <FormSection title="Contract Link" description="Link this shipping instruction to an existing contract.">
        <label className={`col-4 ${requiredLabelClass(Boolean(errors.contractId))}`}>
          <span className="label-text">Contract Number (link only, no auto-fill)</span>
          <input className={dirtyControlClass("contractId")} {...register("contractId")} readOnly={Boolean(initialContractId)} />
          <small>{errors.contractId?.message}</small>
        </label>
        </FormSection>

        <FormSection
          title="Attachments"
          description="Attach supporting shipping instruction documents (multiple files allowed)."
        >
          <AttachmentsField
            embedded
            orgId={DEFAULT_ORG_ID}
            contractId={savedContractId ?? contractIdInput ?? "draft"}
            stage="shipping_instruction_sheet"
            value={attachments}
            onChange={setAttachments}
          />
        </FormSection>

        <FormSection title="Route and Carrier" description="Destination, port of loading, and carrier options.">
        <label className={`col-6 ${requiredLabelClass(Boolean(errors.destinationPort))}`}>
          <span className="label-text">Destination (Port, Country)</span>
          <input className={dirtyControlClass("destinationPort")} {...register("destinationPort")} />
          <small>{errors.destinationPort?.message}</small>
        </label>
        <label className={`col-6 ${requiredLabelClass(Boolean(errors.portOfLoading))}`}>
          <span className="label-text">Port of Loading</span>
          <input className={dirtyControlClass("portOfLoading")} {...register("portOfLoading")} />
          <small>{errors.portOfLoading?.message}</small>
        </label>
        <label className={`col-6 ${requiredLabelClass(Boolean(errors.shippingLine))}`}>
          <span className="label-text">Shipping Line</span>
          <select className={dirtyControlClass("shippingLine")} {...register("shippingLine")}>
            <option value="">Select shipping line</option>
            {selectedShippingLine && !shippingLineOptions.includes(selectedShippingLine) ? (
              <option value={selectedShippingLine}>{selectedShippingLine}</option>
            ) : null}
            {shippingLineOptions.map((line) => (
              <option key={line} value={line}>{line}</option>
            ))}
          </select>
          <small>{errors.shippingLine?.message}</small>
        </label>
        <label className="col-6">
          Service Contract
          <input className={dirtyControlClass("serviceContract")} {...register("serviceContract")} />
        </label>
        <label className="col-4">
          Alternative 1
          <input className={dirtyControlClass("alternative1")} {...register("alternative1")} />
        </label>
        <label className="col-4">
          Alternative 1 Service Contract
          <input className={dirtyControlClass("alternative1ServiceContract")} {...register("alternative1ServiceContract")} />
        </label>
        <label className="col-4">
          Alternative 2
          <input className={dirtyControlClass("alternative2")} {...register("alternative2")} />
        </label>
        <label className="col-12">
          Alternative 2 Service Contract
          <input className={dirtyControlClass("alternative2ServiceContract")} {...register("alternative2ServiceContract")} />
        </label>
        </FormSection>

        <FormSection title="Cargo Details" description="Quantity, packaging, markings, and container details.">
        <label className={`col-4 ${requiredLabelClass(Boolean(errors.quantityValue))}`}>
          <span className="label-text">Quantity</span>
          <input className={dirtyControlClass("quantityValue")} {...register("quantityValue")} />
          <small>{errors.quantityValue?.message}</small>
        </label>
        <label className={`col-4 ${requiredLabelClass(Boolean(errors.packagingValue))}`}>
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
        <label className={`col-4 ${requiredLabelClass(Boolean(errors.noOfBagsValue))}`}>
          <span className="label-text">Number of Bags</span>
          <input className={dirtyControlClass("noOfBagsValue")} {...register("noOfBagsValue")} />
          <small>{errors.noOfBagsValue?.message}</small>
        </label>
        <div className="form-pair-row">
          <label className={`col-8 form-field-stretch ${requiredLabelClass(Boolean(errors.qualityValue))}`}>
            <span className="label-text">Coffee Type</span>
            <textarea className={dirtyControlClass("qualityValue")} {...register("qualityValue")} />
            <small>{errors.qualityValue?.message}</small>
          </label>
          <div className="form-stack form-stack-tight col-4">
            <label className={requiredLabelClass(Boolean(errors.containerCountValue))}>
              <span className="label-text">Containers</span>
              <input className={dirtyControlClass("containerCountValue")} {...register("containerCountValue")} />
              <small>{errors.containerCountValue?.message}</small>
            </label>
            <label>
              Date of Shipment
              <input className={dirtyControlClass("shipmentMonth")} type="date" {...register("shipmentMonth")} />
            </label>
          </div>
        </div>
        <label className="col-6">
          Bag Marking
          <textarea className={dirtyControlClass("bagMarkings")} rows={8} {...register("bagMarkings")} />
        </label>
        <label className="col-6">
          Description
          <textarea className={dirtyControlClass("description")} rows={8} {...register("description")} />
        </label>
        </FormSection>

        <FormSection title="Consignee and Notify Parties" description="Consignee and notify party details for this shipment.">
        <label className="col-6">
          Consignee
          <textarea className={dirtyControlClass("consignee")} rows={4} {...register("consignee")} />
        </label>
        <label className="col-6">
          Notify
          <textarea className={dirtyControlClass("notifyParty")} rows={4} {...register("notifyParty")} />
        </label>
        <label className="col-12">
          2nd Notify
          <textarea className={dirtyControlClass("secondNotify")} rows={4} {...register("secondNotify")} />
        </label>
        </FormSection>

        {savedContractId ? <p>Saved to Contract ID: {savedContractId}</p> : null}
        {apiError ? <p className="error-text">{apiError}</p> : null}

        <FormActionBar hint={isDirty ? "You have unsaved changes." : undefined}>
          <button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Shipping Instruction"}</button>
          <button type="button" className="button-secondary" disabled={!isDirty || saving} onClick={discardChanges}>
            Discard changes
          </button>
          <Link href={bankLcHref}>
            <button type="button" className="button-secondary">Continue to Bank & LC</button>
          </Link>
        </FormActionBar>
      </form>
    </section>
  );
}

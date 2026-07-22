"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AttachmentsField } from "@/components/ui/attachments";
import { CenteredLoader } from "@/components/ui/centered-loader";
import { FormActionBar } from "@/components/ui/form-action-bar";
import { FormSection } from "@/components/ui/form-section";
import { useToast } from "@/components/ui/toast";
import { useUnsavedChangesGuard } from "@/components/ui/use-unsaved-changes-guard";
import { apiClient } from "@/lib/api/client";
import { DEFAULT_ORG_ID } from "@/lib/config";
import type { AttachmentRef, BillOfLadingInfo, CompanyConfiguration, Contract } from "@/types/models";

const schema = z.object({
  contractId: z.string().min(1, "Contract number is required"),
  billType: z.enum(["ORIGINAL BILL No.", "WAYBILL No."]),
  billNo: z.string().optional(),
  noOfCopyBills: z.string().optional(),
  shipperReferenceType: z.enum(["Booking Ref", "Shipper Ref."]),
  shipperReferenceValue: z.string().optional(),
  notify2: z.string().optional(),
  notify3: z.string().optional(),
  cargoMarksText: z.string().optional(),
  descriptionOverride: z.string().optional(),
  movementType: z.string().min(1, "Movement type is required"),
  freightParty: z.string().min(1, "Freight party is required"),
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

export function BillOfLadingForm({
  initialContractId,
  autoLoadExisting = false,
  continueHref,
}: BillOfLadingFormProps) {
  const toast = useToast();
  const attachmentsInputRef = useRef<HTMLInputElement>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedContractId, setSavedContractId] = useState<string | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentRef[]>([]);
  const [movementTypes, setMovementTypes] = useState<string[]>(["FCL/FCL"]);
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
      notify2: "",
      notify3: "",
      cargoMarksText: "",
      descriptionOverride: "",
      movementType: "",
      freightParty: "",
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
    let mounted = true;

    apiClient<CompanyConfiguration>(`/api/company-configuration?orgId=${DEFAULT_ORG_ID}`)
      .then((configuration) => {
        if (!mounted) {
          return;
        }

        const options = (configuration.movementTypes ?? []).map((entry) => entry.trim()).filter(Boolean);
        const nextOptions = options.length > 0 ? options : ["FCL/FCL"];
        setMovementTypes(nextOptions);
        if (!watch("movementType")) {
          setValue("movementType", nextOptions[0], { shouldValidate: true, shouldDirty: false });
        }
      })
      .catch(() => {
        if (mounted && !watch("movementType")) {
          setValue("movementType", "FCL/FCL", { shouldValidate: true, shouldDirty: false });
        }
      });

    return () => {
      mounted = false;
    };
  }, [setValue, watch]);

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
        const sourceBill = source?.payload as (Partial<BillOfLadingInfo> & { attachments?: AttachmentRef[] }) | undefined;
        const storedAttachments = sourceBill?.attachments ?? [];
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
          notify2: bill.notify2 ?? "",
          notify3: bill.notify3 ?? "",
          cargoMarksText: bill.cargoMarksText ?? "",
          descriptionOverride: bill.descriptionOverride ?? "",
          movementType: bill.movementType ?? sourceBill?.movementType ?? movementTypes[0] ?? "",
          freightParty: bill.freightParty ?? sourceBill?.freightParty ?? "",
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
  }, [autoLoadExisting, contractIdInput, initialContractId, movementTypes, reset]);

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
            carrierAgentsEndorsements: "",
            notify2: form.notify2,
            notify3: form.notify3,
            cargoMarksText: form.cargoMarksText,
            descriptionOverride: form.descriptionOverride,
            movementType: form.movementType,
            freightParty: form.freightParty,
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
        className="form-workspace"
        onSubmit={handleSubmit(onSubmit, () => toast.error("Fill in the required fields."))}
      >
        <FormSection title="Contract Link" description="Link this bill of lading to an existing contract.">
          <label className={`col-4 ${errors.contractId ? "is-required field-error" : "is-required"}`}>
            <span className="label-text">Contract Number (link only)</span>
            <input className={dirtyControlClass("contractId")} {...register("contractId")} readOnly={Boolean(initialContractId)} />
            <small>{errors.contractId?.message}</small>
          </label>
        </FormSection>

        <FormSection
          title="Attachments"
          description="Attach carrier drafts, booking confirmations, or B/L support files."
          actions={(
            <button type="button" className="button-secondary" onClick={() => attachmentsInputRef.current?.click()}>
              Add files
            </button>
          )}
        >
          <AttachmentsField
            embedded
            inputRef={attachmentsInputRef}
            orgId={DEFAULT_ORG_ID}
            contractId={savedContractId ?? contractIdInput ?? "draft"}
            stage="bill_of_lading_sheet"
            value={attachments}
            onChange={setAttachments}
          />
        </FormSection>

        <FormSection title="Bill Meta" description="Bill type, number, and shipper reference details.">
          <label className="col-4">
            Bill Type
            <select className={dirtyControlClass("billType")} {...register("billType")}>
              <option value="ORIGINAL BILL No.">ORIGINAL BILL No.</option>
              <option value="WAYBILL No.">WAYBILL No.</option>
            </select>
          </label>
          <label className="col-4">
            Bill No.
            <input className={dirtyControlClass("billNo")} {...register("billNo")} />
          </label>
          <label className="col-4">
            No. of Copy Bills
            <input className={dirtyControlClass("noOfCopyBills")} {...register("noOfCopyBills")} />
          </label>
          <label className="col-4">
            Reference Type
            <select className={dirtyControlClass("shipperReferenceType")} {...register("shipperReferenceType")}>
              <option value="Booking Ref">Booking Ref</option>
              <option value="Shipper Ref.">Shipper Ref.</option>
            </select>
          </label>
          <label className="col-8">
            Reference Value
            <input className={dirtyControlClass("shipperReferenceValue")} {...register("shipperReferenceValue")} />
          </label>
        </FormSection>

        <FormSection title="Party Overrides" description="Additional notify parties when they differ from the contract.">
          <label className="col-6">
            Notify 2
            <textarea className={dirtyControlClass("notify2")} rows={4} {...register("notify2")} />
          </label>
          <label className="col-6">
            Notify 3
            <textarea className={dirtyControlClass("notify3")} rows={4} {...register("notify3")} />
          </label>
        </FormSection>

        <FormSection title="Cargo and Freight Overrides" description="Movement type, freight party, and description overrides.">
          <label className={`col-4 ${errors.movementType ? "is-required field-error" : "is-required"}`}>
            <span className="label-text">Movement Type</span>
            <select className={dirtyControlClass("movementType")} {...register("movementType")} required>
              <option value="">Select movement type</option>
              {movementTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            <small>{errors.movementType?.message}</small>
          </label>
          <label className={`col-8 ${errors.freightParty ? "is-required field-error" : "is-required"}`}>
            <span className="label-text">Freight Party</span>
            <input className={dirtyControlClass("freightParty")} {...register("freightParty")} required />
            <small>{errors.freightParty?.message}</small>
          </label>
          <label className="span-all">
            Description Override
            <textarea className={dirtyControlClass("descriptionOverride")} rows={8} {...register("descriptionOverride")} />
          </label>
        </FormSection>

        {apiError ? <p className="error-text">{apiError}</p> : null}

        <FormActionBar hint={isDirty ? "You have unsaved changes." : undefined}>
          <button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Bill of Lading"}</button>
          <button type="button" className="button-secondary" disabled={!isDirty || saving} onClick={discardChanges}>
            Discard changes
          </button>
          <Link href={nextHref}>
            <button type="button" className="button-secondary">Continue</button>
          </Link>
        </FormActionBar>
      </form>
    </section>
  );
}

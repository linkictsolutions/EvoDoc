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
import { AutoGrowTextarea } from "@/components/ui/auto-grow-textarea";
import { FormActionBar } from "@/components/ui/form-action-bar";
import { FormSection } from "@/components/ui/form-section";
import { useToast } from "@/components/ui/toast";
import { useUnsavedChangesGuard } from "@/components/ui/use-unsaved-changes-guard";

const schema = z.object({
  contractId: z.string().min(1, "Contract number is required"),
  lcNumber: z.string().optional(),
  permitNumber: z.string().optional(),
  sender: z.string().optional(),
  receiver: z.string().optional(),
  applicant: z.string().optional(),
  portOfLoading: z.string().optional(),
  portOfDischarge: z.string().optional(),
  latestShipmentDate: z.string().optional(),
  goodsDescription: z.string().optional(),
  noOfBags: z.string().optional(),
  consignee: z.string().optional(),
  notify: z.string().optional(),
  secondNotify: z.string().optional(),
  currencyAmount: z.string().optional(),
  beneficiaryBank: z.string().optional(),
  bankAddress: z.string().optional(),
  beneficiarySwiftCode: z.string().optional(),
  correspondentBank: z.string().optional(),
  correspondentBankAddress: z.string().optional(),
  beneficiaryAccountNumber: z.string().optional(),
  accountNumber: z.string().optional(),
  correspondentSwiftCode: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface BankLcFormProps {
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

export function BankLcForm({
  initialContractId,
  autoLoadExisting = false,
  continueHref,
}: BankLcFormProps) {
  const toast = useToast();
  const [apiError, setApiError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedContractId, setSavedContractId] = useState<string | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [companyConfiguration, setCompanyConfiguration] = useState<CompanyConfiguration | null>(null);
  const attachmentsInputRef = useRef<HTMLInputElement>(null);
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
      lcNumber: "",
      permitNumber: "",
      sender: "",
      receiver: "",
      applicant: "",
      portOfLoading: "",
      portOfDischarge: "",
      latestShipmentDate: "",
      goodsDescription: "",
      noOfBags: "",
      consignee: "",
      notify: "",
      secondNotify: "",
      currencyAmount: "",
      beneficiaryBank: "",
      bankAddress: "",
      beneficiarySwiftCode: "",
      correspondentBank: "",
      correspondentBankAddress: "",
      beneficiaryAccountNumber: "",
      accountNumber: "",
      correspondentSwiftCode: "",
    },
  });

  const beneficiaryBankRegister = register("beneficiaryBank");
  const beneficiaryAccountRegister = register("beneficiaryAccountNumber");

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

  const contractIdInput = watch("contractId");
  const selectedBeneficiaryBank = watch("beneficiaryBank");
  const reportHref = useMemo(() => {
    if (continueHref) {
      return continueHref;
    }
    const id = savedContractId ?? contractIdInput;
    return id ? `/app/contracts/${encodeURIComponent(id)}/resolved-values` : "/app/contracts";
  }, [contractIdInput, continueHref, savedContractId]);

  const beneficiaryBanks = companyConfiguration?.beneficiaryBanks ?? [];
  const beneficiaryBankOptions = beneficiaryBanks.map((entry) => entry.beneficiaryBank);
  const selectedBeneficiaryProfile = useMemo(() => {
    const selected = selectedBeneficiaryBank?.trim();
    if (!selected) {
      return null;
    }
    return beneficiaryBanks.find(
      (entry) => entry.beneficiaryBank.trim().toLowerCase() === selected.toLowerCase(),
    ) ?? null;
  }, [beneficiaryBanks, selectedBeneficiaryBank]);
  const selectedBeneficiaryAccounts = useMemo(() => {
    const selected = selectedBeneficiaryBank?.trim();
    if (!selected) {
      return [];
    }
    const match = beneficiaryBanks.find(
      (entry) => entry.beneficiaryBank.trim().toLowerCase() === selected.toLowerCase(),
    );
    return match?.beneficiaryAccountNumbers ?? [];
  }, [beneficiaryBanks, selectedBeneficiaryBank]);

  useEffect(() => {
    setValue("beneficiaryAccountNumber", "");
    if (!selectedBeneficiaryProfile) {
      return;
    }
    // These fields are configured once per beneficiary bank, but remain editable if needed.
    setValue("bankAddress", selectedBeneficiaryProfile.beneficiaryBankAddress ?? "");
    setValue("beneficiarySwiftCode", selectedBeneficiaryProfile.swiftNumber ?? "");
  }, [selectedBeneficiaryProfile, selectedBeneficiaryBank, setValue]);

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
    let mounted = true;
    apiClient<CompanyConfiguration>(`/api/company-configuration?orgId=${DEFAULT_ORG_ID}`)
      .then((data) => {
        if (mounted) {
          setCompanyConfiguration(data);
        }
      })
      .catch(() => {
        if (mounted) {
          setCompanyConfiguration(null);
        }
      });

    return () => {
      mounted = false;
    };
  }, [DEFAULT_ORG_ID]);

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

        const banking = data.contract.banking;
        const contractIdentifier = data.contract.contractNumber;
        const bankSource = data.sourceInputs?.find(
          (input) => input.id === "bank_lc_sheet" || input.sourceType === "bank_lc_sheet",
        );
        const storedAttachments = (bankSource?.payload as { attachments?: AttachmentRef[] } | undefined)?.attachments ?? [];
        const nextAttachments = Array.isArray(storedAttachments) ? storedAttachments : [];
        setAttachments(nextAttachments);
        setSavedContractId(contractIdentifier);
        const nextForm: FormData = {
            contractId: contractIdentifier,
            lcNumber: banking.lcNumber ?? "",
            permitNumber: banking.permitNumber ?? "",
            sender: banking.sender ?? "",
            receiver: banking.receiver ?? "",
            applicant: banking.applicant ?? "",
            portOfLoading: banking.portOfLoading ?? "",
            portOfDischarge: banking.portOfDischarge ?? "",
            latestShipmentDate: toDateInputValue(banking.latestShipmentDate),
            goodsDescription: banking.goodsDescription ?? "",
            noOfBags: banking.noOfBags ?? "",
            consignee: banking.consignee ?? "",
            notify: banking.notify ?? "",
            secondNotify: banking.secondNotify ?? "",
            currencyAmount: banking.currencyAmount ?? "",
            beneficiaryBank: banking.beneficiaryBank ?? "",
            bankAddress: banking.bankAddress ?? "",
            beneficiarySwiftCode: banking.beneficiarySwiftCode ?? banking.swiftCode ?? "",
            correspondentBank: banking.correspondentBank ?? "",
            correspondentBankAddress: banking.correspondentBankAddress ?? banking.receiver ?? "",
            beneficiaryAccountNumber: banking.beneficiaryAccountNumber ?? "",
            accountNumber: banking.accountNumber ?? "",
            correspondentSwiftCode: banking.correspondentSwiftCode ?? "",
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
      const result = await apiClient<{ contractId: string }>("/api/contracts/bank-lc", {
        method: "POST",
        body: JSON.stringify({
          orgId: DEFAULT_ORG_ID,
          contractId: form.contractId,
          attachments,
          banking: {
            lcNumber: form.lcNumber,
            permitNumber: form.permitNumber,
            sender: form.sender,
            receiver: form.receiver,
            applicant: form.applicant,
            portOfLoading: form.portOfLoading,
            portOfDischarge: form.portOfDischarge,
            latestShipmentDate: form.latestShipmentDate,
            goodsDescription: form.goodsDescription,
            noOfBags: form.noOfBags,
            consignee: form.consignee,
            notify: form.notify,
            secondNotify: form.secondNotify,
            currencyAmount: form.currencyAmount,
            beneficiaryBank: form.beneficiaryBank,
            bankAddress: form.bankAddress,
            beneficiarySwiftCode: form.beneficiarySwiftCode,
            correspondentBank: form.correspondentBank,
            correspondentBankAddress: form.correspondentBankAddress,
            beneficiaryAccountNumber: form.beneficiaryAccountNumber,
            accountNumber: form.accountNumber,
            correspondentSwiftCode: form.correspondentSwiftCode,
          },
        }),
      });

      setSavedContractId(result.contractId);
      lastSavedRef.current = { form, attachments };
      setHighlightDirty(false);
      reset(form, { keepDirty: false, keepTouched: false });
      toast.success("Bank & LC saved.");
      if (typeof window !== "undefined") {
        window.localStorage.setItem("evodoc.contractId", result.contractId);
      }
    } catch (error) {
      setApiError((error as Error).message);
      toast.error("Unable to save Bank & LC.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="page-shell">
      {loadingExisting ? <CenteredLoader label="Loading existing Bank & LC data..." scope="inline" /> : null}

      <form
        className="form-workspace"
        onSubmit={handleSubmit(onSubmit, () => toast.error("Fill in the required fields."))}
      >
        <FormSection title="Contract Link" description="Link this bank and LC document to an existing contract.">
        <label className={`col-4 ${requiredLabelClass(Boolean(errors.contractId))}`}>
          <span className="label-text">Contract Number (link only)</span>
          <input className={dirtyControlClass("contractId")} {...register("contractId")} readOnly={Boolean(initialContractId)} />
          <small>{errors.contractId?.message}</small>
        </label>
        </FormSection>

        <FormSection
          title="Attachments"
          description="Attach LC documents, bank letters, or related files (multiple allowed)."
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
            stage="bank_lc_sheet"
            value={attachments}
            onChange={setAttachments}
          />
        </FormSection>

        <FormSection title="LC Information" description="Letter of credit details, ports, and goods description.">
        <label className="col-4">
          LC No
          <input className={dirtyControlClass("lcNumber")} {...register("lcNumber")} />
        </label>
        <label className="col-3">
          Latest Date of Shipment
          <input className={dirtyControlClass("latestShipmentDate")} type="date" {...register("latestShipmentDate")} />
        </label>
        <label className="col-5">
          Number of Bags
          <input className={dirtyControlClass("noOfBags")} {...register("noOfBags")} />
        </label>
        <div className="form-pair-row">
          <label className="col-8 form-field-stretch">
            Applicant
            <textarea className={dirtyControlClass("applicant")} {...register("applicant")} />
          </label>
          <div className="form-stack form-stack-tight col-4">
            <label>
              Port of Loading / Airport of Departure
              <input className={dirtyControlClass("portOfLoading")} {...register("portOfLoading")} />
            </label>
            <label>
              Port of Discharge / Airport of Destination
              <input className={dirtyControlClass("portOfDischarge")} {...register("portOfDischarge")} />
            </label>
          </div>
        </div>
        <label className="span-all">
          Description of Goods
          <textarea className={dirtyControlClass("goodsDescription")} rows={8} {...register("goodsDescription")} />
        </label>
        <label className="col-4">
          Currency Amount
          <input className={dirtyControlClass("currencyAmount")} {...register("currencyAmount")} />
        </label>
        <label className="col-4">
          Sender
          <input className={dirtyControlClass("sender")} {...register("sender")} />
        </label>
        <label className="col-4">
          Receiver
          <input className={dirtyControlClass("receiver")} {...register("receiver")} />
        </label>
        </FormSection>

        <FormSection title="Consignee and Notify Parties" description="Consignee and notify party details from the LC.">
        <label className="col-12">
          Consignee
          <textarea className={dirtyControlClass("consignee")} rows={4} {...register("consignee")} />
        </label>
        <label className="col-6">
          Notify
          <AutoGrowTextarea className={dirtyControlClass("notify")} rows={4} {...register("notify")} />
        </label>
        <label className="col-6">
          2nd Notify
          <AutoGrowTextarea className={dirtyControlClass("secondNotify")} rows={4} {...register("secondNotify")} />
        </label>
        </FormSection>

        <FormSection title="Bank Details (Beneficiary)" description="Beneficiary bank, account, and address details.">
        <label className="col-3">
          Bank Permit
          <input className={dirtyControlClass("permitNumber")} {...register("permitNumber")} />
        </label>
        <label className="col-5">
          Bank of Beneficiary
          <select
            className={dirtyControlClass("beneficiaryBank")}
            {...beneficiaryBankRegister}
            onChange={(event) => {
              beneficiaryBankRegister.onChange(event);
              setValue("beneficiaryAccountNumber", "");
            }}
            disabled={beneficiaryBankOptions.length === 0}
          >
            <option value="">
              {beneficiaryBankOptions.length === 0 ? "No beneficiary banks configured" : "Select beneficiary bank"}
            </option>
            {beneficiaryBankOptions.map((bank) => (
              <option key={bank} value={bank}>{bank}</option>
            ))}
          </select>
          {beneficiaryBankOptions.length === 0 ? (
            <small className="muted-text">Configure beneficiary banks in Company Config to enable dropdowns.</small>
          ) : null}
        </label>
        <label className="col-4">
          Beneficiary Account No
          <select
            className={dirtyControlClass("beneficiaryAccountNumber")}
            {...beneficiaryAccountRegister}
            disabled={!selectedBeneficiaryBank || selectedBeneficiaryAccounts.length === 0}
          >
            <option value="">
              {!selectedBeneficiaryBank
                ? "Select beneficiary bank first"
                : selectedBeneficiaryAccounts.length === 0
                  ? "No accounts for this bank"
                  : "Select beneficiary account"}
            </option>
            {selectedBeneficiaryAccounts.map((account) => (
              <option key={account} value={account}>{account}</option>
            ))}
          </select>
          {selectedBeneficiaryBank && selectedBeneficiaryAccounts.length === 0 ? (
            <small className="muted-text">No beneficiary account numbers configured for this bank.</small>
          ) : null}
        </label>
        <div className="form-pair-row">
          <div className="form-stack form-stack-tight col-4">
            <label>
              Name of Beneficiary
              <input value={companyConfiguration?.sellerName ?? ""} readOnly disabled />
            </label>
            <label>
              SWIFT Number
              <input className={dirtyControlClass("beneficiarySwiftCode")} {...register("beneficiarySwiftCode")} />
            </label>
          </div>
          <label className="col-8 form-field-stretch">
            Address of Bank
            <textarea className={dirtyControlClass("bankAddress")} {...register("bankAddress")} />
          </label>
        </div>
        </FormSection>

        <FormSection title="Correspondent Bank" description="Correspondent bank name, SWIFT, account, and address.">
        <label className="col-6">
          Bank Name
          <input className={dirtyControlClass("correspondentBank")} {...register("correspondentBank")} />
        </label>
        <label className="col-3">
          SWIFT Number
          <input className={dirtyControlClass("correspondentSwiftCode")} {...register("correspondentSwiftCode")} />
        </label>
        <label className="col-3">
          Acc. No
          <input className={dirtyControlClass("accountNumber")} {...register("accountNumber")} />
        </label>
        <label className="span-all">
          Address
          <textarea className={dirtyControlClass("correspondentBankAddress")} rows={3} {...register("correspondentBankAddress")} />
        </label>
        </FormSection>

        {savedContractId ? <p>Saved to Contract ID: {savedContractId}</p> : null}
        {apiError ? <p className="error-text">{apiError}</p> : null}

        <FormActionBar hint={isDirty ? "You have unsaved changes." : undefined}>
          <button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Bank & LC"}</button>
          <button type="button" className="button-secondary" disabled={!isDirty || saving} onClick={discardChanges}>
            Discard changes
          </button>
          <Link href={reportHref}>
            <button type="button" className="button-secondary">View Resolved Values</button>
          </Link>
        </FormActionBar>
      </form>
    </section>
  );
}

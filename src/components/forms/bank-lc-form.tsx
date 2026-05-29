"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { apiClient } from "@/lib/api/client";
import { DEFAULT_ORG_ID } from "@/lib/config";
import type { CompanyConfiguration, Contract } from "@/types/models";
import { CenteredLoader } from "@/components/ui/centered-loader";
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
  correspondentBank: z.string().optional(),
  swiftCode: z.string().optional(),
  beneficiaryAccountNumber: z.string().optional(),
  accountNumber: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface BankLcFormProps {
  initialContractId?: string;
  autoLoadExisting?: boolean;
  continueHref?: string;
}

interface ContractDetailResponse {
  contract: Contract;
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

  const {
    register,
    watch,
    setValue,
    reset,
    handleSubmit,
    formState: { errors, isDirty },
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
      correspondentBank: "",
      swiftCode: "",
      beneficiaryAccountNumber: "",
      accountNumber: "",
    },
  });

  const beneficiaryBankRegister = register("beneficiaryBank");
  const beneficiaryAccountRegister = register("beneficiaryAccountNumber");

  useUnsavedChangesGuard({ enabled: isDirty && !saving });

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
    setValue("swiftCode", selectedBeneficiaryProfile.swiftNumber ?? "");
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
        setSavedContractId(contractIdentifier);
        reset(
          {
            contractId: contractIdentifier,
            lcNumber: banking.lcNumber ?? "",
            permitNumber: banking.permitNumber ?? "",
            sender: banking.sender ?? "",
            receiver: banking.receiver ?? "",
            applicant: banking.applicant ?? "",
            portOfLoading: banking.portOfLoading ?? "",
            portOfDischarge: banking.portOfDischarge ?? "",
            latestShipmentDate: banking.latestShipmentDate ?? "",
            goodsDescription: banking.goodsDescription ?? "",
            noOfBags: banking.noOfBags ?? "",
            consignee: banking.consignee ?? "",
            notify: banking.notify ?? "",
            secondNotify: banking.secondNotify ?? "",
            currencyAmount: banking.currencyAmount ?? "",
            beneficiaryBank: banking.beneficiaryBank ?? "",
            bankAddress: banking.bankAddress ?? "",
            correspondentBank: banking.correspondentBank ?? "",
            swiftCode: banking.swiftCode ?? "",
            beneficiaryAccountNumber: banking.beneficiaryAccountNumber ?? "",
            accountNumber: banking.accountNumber ?? "",
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
  }, [autoLoadExisting, contractIdInput, initialContractId, reset]);

  async function onSubmit(form: FormData) {
    setSaving(true);
    setApiError(null);

    try {
      const result = await apiClient<{ contractId: string }>("/api/contracts/bank-lc", {
        method: "POST",
        body: JSON.stringify({
          orgId: DEFAULT_ORG_ID,
          contractId: form.contractId,
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
            correspondentBank: form.correspondentBank,
            swiftCode: form.swiftCode,
            beneficiaryAccountNumber: form.beneficiaryAccountNumber,
            accountNumber: form.accountNumber,
          },
        }),
      });

      setSavedContractId(result.contractId);
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
      <header className="page-header">
        <h1>Bank &amp; LC Source Document</h1>
        <p>Capture banking and letter-of-credit details for this contract.</p>
        {loadingExisting ? <CenteredLoader label="Loading existing Bank & LC data..." scope="inline" /> : null}
      </header>

      <form
        className="card form-grid"
        onSubmit={handleSubmit(onSubmit, () => toast.error("Fill in the required fields."))}
      >
        <h3 className="span-all">Contract Link</h3>
        <label className={requiredLabelClass(Boolean(errors.contractId))}>
          <span className="label-text">Contract Number (link only)</span>
          <input {...register("contractId")} readOnly={Boolean(initialContractId)} />
          <small>{errors.contractId?.message}</small>
        </label>

        <h3 className="span-all">LC Information</h3>
        <label>
          LC No
          <input {...register("lcNumber")} />
        </label>
        <label>
          Applicant
          <input {...register("applicant")} />
        </label>
        <label>
          Port of Loading / Airport of Departure
          <input {...register("portOfLoading")} />
        </label>
        <label>
          Port of Discharge / Airport of Destination
          <input {...register("portOfDischarge")} />
        </label>
        <label>
          Latest Date of Shipment
          <input {...register("latestShipmentDate")} />
        </label>
        <label className="span-all">
          Description of Goods
          <textarea rows={3} {...register("goodsDescription")} />
        </label>
        <label>
          Number of Bags
          <input {...register("noOfBags")} />
        </label>
        <label>
          Currency Amount
          <input {...register("currencyAmount")} />
        </label>
        <label>
          Sender
          <input {...register("sender")} />
        </label>
        <label>
          Receiver
          <input {...register("receiver")} />
        </label>

        <h3 className="span-all">Consignee and Notify Parties</h3>
        <label>
          Consignee
          <textarea rows={2} {...register("consignee")} />
        </label>
        <label>
          Notify
          <textarea rows={2} {...register("notify")} />
        </label>
        <label>
          2nd Notify
          <textarea rows={2} {...register("secondNotify")} />
        </label>

        <h3 className="span-all">Bank Information</h3>
        <label>
          Bank Permit
          <input {...register("permitNumber")} />
        </label>
        <label>
          Beneficiary Bank
          <select
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
        <label>
          Address of Bank
          <input {...register("bankAddress")} />
        </label>
        <label>
          Beneficiary Account No
          <select
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
        <label>
          Correspondent Bank
          <input {...register("correspondentBank")} />
        </label>
        <label>
          SWIFT Number
          <input {...register("swiftCode")} />
        </label>
        <label>
          Account No
          <input {...register("accountNumber")} />
        </label>

        <div className="row-actions">
          <button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Bank & LC"}</button>
          <Link href={reportHref}>
            <button type="button" className="button-secondary">View Resolved Values</button>
          </Link>
        </div>
        {savedContractId ? <p>Saved to Contract ID: {savedContractId}</p> : null}
        {apiError ? <p className="error-text">{apiError}</p> : null}
      </form>
    </section>
  );
}

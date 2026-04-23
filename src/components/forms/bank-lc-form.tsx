"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { apiClient } from "@/lib/api/client";
import { DEFAULT_ORG_ID } from "@/lib/config";
import type { Contract } from "@/types/models";

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
  const [apiError, setApiError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedContractId, setSavedContractId] = useState<string | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(false);

  const {
    register,
    watch,
    setValue,
    handleSubmit,
    formState: { errors },
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

  const contractIdInput = watch("contractId");
  const reportHref = useMemo(() => {
    if (continueHref) {
      return continueHref;
    }
    const id = savedContractId ?? contractIdInput;
    return id ? `/app/contracts/${encodeURIComponent(id)}/resolved-values` : "/app/contracts";
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

        const banking = data.contract.banking;
        const contractIdentifier = data.contract.contractNumber;
        setSavedContractId(contractIdentifier);
        setValue("contractId", contractIdentifier, { shouldValidate: true });
        setValue("lcNumber", banking.lcNumber ?? "");
        setValue("permitNumber", banking.permitNumber ?? "");
        setValue("sender", banking.sender ?? "");
        setValue("receiver", banking.receiver ?? "");
        setValue("applicant", banking.applicant ?? "");
        setValue("portOfLoading", banking.portOfLoading ?? "");
        setValue("portOfDischarge", banking.portOfDischarge ?? "");
        setValue("latestShipmentDate", banking.latestShipmentDate ?? "");
        setValue("goodsDescription", banking.goodsDescription ?? "");
        setValue("noOfBags", banking.noOfBags ?? "");
        setValue("consignee", banking.consignee ?? "");
        setValue("notify", banking.notify ?? "");
        setValue("secondNotify", banking.secondNotify ?? "");
        setValue("currencyAmount", banking.currencyAmount ?? "");
        setValue("beneficiaryBank", banking.beneficiaryBank ?? "");
        setValue("bankAddress", banking.bankAddress ?? "");
        setValue("correspondentBank", banking.correspondentBank ?? "");
        setValue("swiftCode", banking.swiftCode ?? "");
        setValue("beneficiaryAccountNumber", banking.beneficiaryAccountNumber ?? "");
        setValue("accountNumber", banking.accountNumber ?? "");
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
  }, [autoLoadExisting, contractIdInput, initialContractId, setValue]);

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
      if (typeof window !== "undefined") {
        window.localStorage.setItem("evodoc.contractId", result.contractId);
      }
    } catch (error) {
      setApiError((error as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="page-shell">
      <header className="page-header">
        <h1>Bank &amp; LC Source Document</h1>
        <p>Recreates Bank & LC sheet as an independent source input.</p>
        {loadingExisting ? <p>Loading existing Bank & LC data...</p> : null}
      </header>

      <form className="card form-grid" onSubmit={handleSubmit(onSubmit)}>
        <h3 className="span-all">Contract Link</h3>
        <label>
          Contract Number (link only)
          <input {...register("contractId")} readOnly={Boolean(initialContractId)} />
          <small>{errors.contractId?.message}</small>
        </label>

        <h3 className="span-all">LC Information (C column)</h3>
        <label>
          LC No - C4
          <input {...register("lcNumber")} />
        </label>
        <label>
          Applicant - C10
          <input {...register("applicant")} />
        </label>
        <label>
          Port of Loading / Airport of Dep. - C12
          <input {...register("portOfLoading")} />
        </label>
        <label>
          Port of Discharge / Airport of Dest. - C14
          <input {...register("portOfDischarge")} />
        </label>
        <label>
          Latest Date of Shipment - C16
          <input {...register("latestShipmentDate")} />
        </label>
        <label className="span-all">
          Description of Goods - C18
          <textarea rows={3} {...register("goodsDescription")} />
        </label>
        <label>
          No of Bag - C20
          <input {...register("noOfBags")} />
        </label>
        <label>
          Currency Amount - C27
          <input {...register("currencyAmount")} />
        </label>
        <label>
          Sender - C7
          <input {...register("sender")} />
        </label>
        <label>
          Receiver - C8
          <input {...register("receiver")} />
        </label>

        <h3 className="span-all">Consignee and Notify Parties</h3>
        <label>
          Consignee - C22
          <textarea rows={2} {...register("consignee")} />
        </label>
        <label>
          Notify - C25
          <textarea rows={2} {...register("notify")} />
        </label>
        <label>
          2nd Notify - C26
          <textarea rows={2} {...register("secondNotify")} />
        </label>

        <h3 className="span-all">Bank Information (G column)</h3>
        <label>
          Bank Permit - G5
          <input {...register("permitNumber")} />
        </label>
        <label>
          Beneficiary Bank - G7
          <input {...register("beneficiaryBank")} />
        </label>
        <label>
          Address of Bank - G9/G14
          <input {...register("bankAddress")} />
        </label>
        <label>
          Beneficiaries Acc. No - G11
          <input {...register("beneficiaryAccountNumber")} />
        </label>
        <label>
          Correspondent Bank - G13
          <input {...register("correspondentBank")} />
        </label>
        <label>
          SWIFT Number - G15
          <input {...register("swiftCode")} />
        </label>
        <label>
          Acc. No - G16
          <input {...register("accountNumber")} />
        </label>

        <div className="row-actions">
          <button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Bank & LC"}</button>
          <Link href={reportHref}>
            <button type="button" className="button-secondary">View Contract-SI-LC Final Report</button>
          </Link>
        </div>
        {savedContractId ? <p>Saved to Contract ID: {savedContractId}</p> : null}
        {apiError ? <p className="error-text">{apiError}</p> : null}
      </form>
    </section>
  );
}

"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { apiClient } from "@/lib/api/client";
import { DEFAULT_ORG_ID } from "@/lib/config";
import type { Contract } from "@/types/models";
import { CenteredLoader } from "@/components/ui/centered-loader";
import { useToast } from "@/components/ui/toast";

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

  const {
    register,
    setValue,
    watch,
    handleSubmit,
    formState: { errors },
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
        setSavedContractId(contractIdentifier);
        setValue("contractId", contractIdentifier, { shouldValidate: true });
        setValue("destinationPort", shipping.destinationPort ?? "");
        setValue("shippingLine", shipping.shippingLine ?? "");
        setValue("serviceContract", shipping.serviceContract ?? "");
        setValue("alternative1", shipping.alternative1 ?? "");
        setValue("alternative1ServiceContract", shipping.alternative1ServiceContract ?? "");
        setValue("alternative2", shipping.alternative2 ?? "");
        setValue("alternative2ServiceContract", shipping.alternative2ServiceContract ?? "");
        setValue("portOfLoading", shipping.portOfLoading ?? "");
        setValue("quantityValue", shipping.quantityValue ?? "");
        setValue("qualityValue", shipping.qualityValue ?? "");
        setValue("packagingValue", shipping.packagingValue ?? "");
        setValue("noOfBagsValue", shipping.noOfBagsValue ?? "");
        setValue("containerCountValue", shipping.containerCountValue ?? "");
        setValue("shipmentMonth", toMonthInputValue(shipping.shipmentMonth));
        setValue("bagMarkings", shipping.bagMarkings ?? "");
        setValue("description", shipping.description ?? "");
        setValue("consignee", shipping.consignee ?? "");
        setValue("notifyParty", shipping.notifyParty ?? "");
        setValue("secondNotify", shipping.secondNotify ?? "");
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
      const result = await apiClient<{ contractId: string }>("/api/contracts/shipping", {
        method: "POST",
        body: JSON.stringify({
          orgId: DEFAULT_ORG_ID,
          contractId: form.contractId,
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

      <form className="card form-grid" onSubmit={handleSubmit(onSubmit)}>
        <h3 className="span-all">Contract Link</h3>
        <label>
          Contract Number (link only, no auto-fill)
          <input {...register("contractId")} readOnly={Boolean(initialContractId)} />
          <small>{errors.contractId?.message}</small>
        </label>

        <h3 className="span-all">Route and Carrier</h3>
        <label>
          Destination (Port, Country)
          <input {...register("destinationPort")} />
          <small>{errors.destinationPort?.message}</small>
        </label>
        <label>
          Port of Loading
          <input {...register("portOfLoading")} />
          <small>{errors.portOfLoading?.message}</small>
        </label>
        <label>
          Shipping Line
          <input {...register("shippingLine")} />
          <small>{errors.shippingLine?.message}</small>
        </label>
        <label>
          Service Contract
          <input {...register("serviceContract")} />
        </label>
        <label>
          Alternative 1
          <input {...register("alternative1")} />
        </label>
        <label>
          Alternative 1 Service Contract
          <input {...register("alternative1ServiceContract")} />
        </label>
        <label>
          Alternative 2
          <input {...register("alternative2")} />
        </label>
        <label>
          Alternative 2 Service Contract
          <input {...register("alternative2ServiceContract")} />
        </label>

        <h3 className="span-all">Cargo Details</h3>
        <label>
          Quantity
          <input {...register("quantityValue")} />
          <small>{errors.quantityValue?.message}</small>
        </label>
        <label>
          Quality
          <textarea rows={3} {...register("qualityValue")} />
          <small>{errors.qualityValue?.message}</small>
        </label>
        <label>
          Packaging
          <input {...register("packagingValue")} />
          <small>{errors.packagingValue?.message}</small>
        </label>
        <label>
          Number of Bags
          <input {...register("noOfBagsValue")} />
          <small>{errors.noOfBagsValue?.message}</small>
        </label>
        <label>
          Containers
          <input {...register("containerCountValue")} />
          <small>{errors.containerCountValue?.message}</small>
        </label>
        <label>
          Shipment Month
          <input type="month" {...register("shipmentMonth")} />
        </label>
        <label>
          Bag Marking
          <textarea rows={6} {...register("bagMarkings")} />
        </label>
        <label>
          Description
          <textarea rows={8} {...register("description")} />
        </label>

        <h3 className="span-all">Consignee and Notify Parties</h3>
        <label>
          Consignee
          <textarea rows={3} {...register("consignee")} />
        </label>
        <label>
          Notify
          <textarea rows={3} {...register("notifyParty")} />
        </label>
        <label>
          2nd Notify
          <textarea rows={3} {...register("secondNotify")} />
        </label>

        <div className="row-actions">
          <button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Shipping Instruction"}</button>
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

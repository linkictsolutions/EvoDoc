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
  contractId: z.string().min(1, "Contract ID is required"),
  destinationPort: z.string().min(1, "Destination is required"),
  shippingLine: z.string().min(1, "Shipping line is required"),
  serviceContract: z.string().optional(),
  alternative1: z.string().optional(),
  alternative1ServiceContract: z.string().optional(),
  alternative1Selected: z.boolean(),
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
  revisedConsignee: z.string().optional(),
  notifyParty: z.string().optional(),
  revisedNotifyParty: z.string().optional(),
  secondNotify: z.string().optional(),
  revisedSecondNotify: z.string().optional(),
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

export function ShippingInstructionForm({
  initialContractId,
  autoLoadExisting = false,
  continueHref,
}: ShippingInstructionFormProps) {
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
      alternative1Selected: false,
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
      revisedConsignee: "",
      notifyParty: "",
      revisedNotifyParty: "",
      secondNotify: "",
      revisedSecondNotify: "",
    },
  });

  const contractIdInput = watch("contractId");

  const bankLcHref = useMemo(() => {
    if (continueHref) {
      return continueHref;
    }
    const id = savedContractId ?? contractIdInput;
    return id ? `/app/contracts/${id}/inputs/bank-lc` : "/app/contracts";
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
        setSavedContractId(data.contract.id);
        setValue("contractId", data.contract.id, { shouldValidate: true });
        setValue("destinationPort", shipping.destinationPort ?? "");
        setValue("shippingLine", shipping.shippingLine ?? "");
        setValue("serviceContract", shipping.serviceContract ?? "");
        setValue("alternative1", shipping.alternative1 ?? "");
        setValue("alternative1ServiceContract", shipping.alternative1ServiceContract ?? "");
        setValue("alternative1Selected", Boolean(shipping.alternative1Selected));
        setValue("alternative2", shipping.alternative2 ?? "");
        setValue("alternative2ServiceContract", shipping.alternative2ServiceContract ?? "");
        setValue("portOfLoading", shipping.portOfLoading ?? "");
        setValue("quantityValue", shipping.quantityValue ?? "");
        setValue("qualityValue", shipping.qualityValue ?? "");
        setValue("packagingValue", shipping.packagingValue ?? "");
        setValue("noOfBagsValue", shipping.noOfBagsValue ?? "");
        setValue("containerCountValue", shipping.containerCountValue ?? "");
        setValue("shipmentMonth", shipping.shipmentMonth ?? "");
        setValue("bagMarkings", shipping.bagMarkings ?? "");
        setValue("description", shipping.description ?? "");
        setValue("consignee", shipping.consignee ?? "");
        setValue("revisedConsignee", shipping.revisedConsignee ?? "");
        setValue("notifyParty", shipping.notifyParty ?? "");
        setValue("revisedNotifyParty", shipping.revisedNotifyParty ?? "");
        setValue("secondNotify", shipping.secondNotify ?? "");
        setValue("revisedSecondNotify", shipping.revisedSecondNotify ?? "");
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
            alternative1Selected: form.alternative1Selected,
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
            revisedConsignee: form.revisedConsignee,
            notifyParty: form.notifyParty,
            revisedNotifyParty: form.revisedNotifyParty,
            secondNotify: form.secondNotify,
            revisedSecondNotify: form.revisedSecondNotify,
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
        <h1>Shipping Instruction Input</h1>
        <p>
          {autoLoadExisting
            ? "Recreates the Shipping Instruction sheet and loads existing values for editing."
            : "Recreates the Shipping Instruction sheet as a separate source input."}
        </p>
        {loadingExisting ? <p>Loading existing shipping data...</p> : null}
      </header>

      <form className="card form-grid" onSubmit={handleSubmit(onSubmit)}>
        <h3 style={{ gridColumn: "1 / -1" }}>Contract Link</h3>
        <label>
          Contract ID (link only, no auto-fill)
          <input {...register("contractId")} readOnly={Boolean(initialContractId)} />
          <small>{errors.contractId?.message}</small>
        </label>

        <h3 style={{ gridColumn: "1 / -1" }}>Route and Carrier</h3>
        <label>
          Destination (Port, Country) - C5
          <input {...register("destinationPort")} />
          <small>{errors.destinationPort?.message}</small>
        </label>
        <label>
          Port of Loading - C13
          <input {...register("portOfLoading")} />
          <small>{errors.portOfLoading?.message}</small>
        </label>
        <label>
          Shipping Line - C7
          <input {...register("shippingLine")} />
          <small>{errors.shippingLine?.message}</small>
        </label>
        <label>
          Service Contract - E7
          <input {...register("serviceContract")} />
        </label>
        <label>
          Alternative 1 - C9
          <input {...register("alternative1")} />
        </label>
        <label>
          Alternative 1 Service Contract - E9
          <input {...register("alternative1ServiceContract")} />
        </label>
        <label>
          Alternative 2 - C11
          <input {...register("alternative2")} />
        </label>
        <label>
          Alternative 2 Service Contract - E11
          <input {...register("alternative2ServiceContract")} />
        </label>
        <label style={{ gridColumn: "1 / -1" }}>
          <span>Alternative 1 Selected - H9</span>
          <input type="checkbox" {...register("alternative1Selected")} />
        </label>

        <h3 style={{ gridColumn: "1 / -1" }}>Cargo Block (C15:C23)</h3>
        <label>
          Quantity - C15
          <input {...register("quantityValue")} />
          <small>{errors.quantityValue?.message}</small>
        </label>
        <label>
          Quality - C16
          <input {...register("qualityValue")} />
          <small>{errors.qualityValue?.message}</small>
        </label>
        <label>
          Packaging - C17
          <input {...register("packagingValue")} />
          <small>{errors.packagingValue?.message}</small>
        </label>
        <label>
          No of Bags - C18
          <input {...register("noOfBagsValue")} />
          <small>{errors.noOfBagsValue?.message}</small>
        </label>
        <label>
          Containers - C19
          <input {...register("containerCountValue")} />
          <small>{errors.containerCountValue?.message}</small>
        </label>
        <label>
          Shipment Month - C21
          <input {...register("shipmentMonth")} />
        </label>
        <label style={{ gridColumn: "1 / -1" }}>
          Bag Marking - C22
          <textarea rows={3} {...register("bagMarkings")} />
        </label>
        <label style={{ gridColumn: "1 / -1" }}>
          Description - C23
          <textarea rows={4} {...register("description")} />
        </label>

        <h3 style={{ gridColumn: "1 / -1" }}>Revised Entry Section (C/E/F rows 25, 27, 29)</h3>
        <label>
          Consignee - C25
          <textarea rows={3} {...register("consignee")} />
        </label>
        <label>
          Revised Consignee - F25
          <textarea rows={3} {...register("revisedConsignee")} />
        </label>
        <label>
          Notify - C27
          <textarea rows={3} {...register("notifyParty")} />
        </label>
        <label>
          Revised Notify - F27
          <textarea rows={3} {...register("revisedNotifyParty")} />
        </label>
        <label>
          2nd Notify - C29
          <textarea rows={3} {...register("secondNotify")} />
        </label>
        <label>
          Revised 2nd Notify - F29
          <textarea rows={3} {...register("revisedSecondNotify")} />
        </label>

        <div className="row-actions">
          <button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Shipping Instruction"}</button>
          <Link href={bankLcHref}>
            <button type="button">Continue to Bank & LC</button>
          </Link>
        </div>
        {savedContractId ? <p>Saved to Contract ID: {savedContractId}</p> : null}
        {apiError ? <p className="error-text">{apiError}</p> : null}
      </form>
    </section>
  );
}

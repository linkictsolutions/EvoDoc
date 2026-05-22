"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiClient } from "@/lib/api/client";
import { DEFAULT_ORG_ID } from "@/lib/config";
import { useToast } from "@/components/ui/toast";
import { useUnsavedChangesGuard } from "@/components/ui/use-unsaved-changes-guard";

const shipmentSchema = z.object({
  vessel: z.string().optional(),
  voyageNo: z.string().optional(),
  bookingReference: z.string().optional(),
  bags: z.number().int().nonnegative(),
  grossWeightKg: z.number().nonnegative(),
  tareWeightKg: z.number().nonnegative(),
  containerNumber: z.string().optional(),
  sealNumber: z.string().optional(),
});

type ShipmentFormData = z.infer<typeof shipmentSchema>;

export function ShipmentForm({ contractId }: { contractId: string }) {
  const toast = useToast();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<ShipmentFormData>({
    resolver: zodResolver(shipmentSchema),
  });

  useUnsavedChangesGuard({ enabled: isDirty && !saving });

  function requiredLabelClass(hasError: boolean) {
    return hasError ? "is-required field-error" : "is-required";
  }

  async function onSubmit(values: ShipmentFormData) {
    setError(null);
    setSaving(true);

    try {
      const data = await apiClient<{ shipmentId: string }>(`/api/contracts/${contractId}/shipments`, {
        method: "POST",
        body: JSON.stringify({
          orgId: DEFAULT_ORG_ID,
          shipment: {
            status: "draft",
            vessel: values.vessel,
            voyageNo: values.voyageNo,
            bookingReference: values.bookingReference,
            bookingLines: [
              {
                lineNo: 1,
                bags: values.bags,
                grossWeightKg: values.grossWeightKg,
                tareWeightKg: values.tareWeightKg,
                containerNumber: values.containerNumber,
                sealNumber: values.sealNumber,
              },
            ],
          },
        }),
      });

      toast.success("Shipment saved.");
      router.push(`/app/contracts/${contractId}/shipments/${data.shipmentId}`);
    } catch (submitError) {
      setError((submitError as Error).message);
      toast.error("Unable to save shipment.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      className="card form-grid"
      onSubmit={handleSubmit(onSubmit, () => toast.error("Fill in the required fields."))}
    >
      <label>
        Vessel
        <input {...register("vessel")} />
      </label>
      <label>
        Voyage Number
        <input {...register("voyageNo")} />
      </label>
      <label>
        Booking Reference
        <input {...register("bookingReference")} />
      </label>
      <label className={requiredLabelClass(Boolean(errors.bags))}>
        <span className="label-text">Bags</span>
        <input type="number" {...register("bags", { valueAsNumber: true })} />
        <small>{errors.bags?.message}</small>
      </label>
      <label className={requiredLabelClass(Boolean(errors.grossWeightKg))}>
        <span className="label-text">Gross Weight (kg)</span>
        <input type="number" step="0.001" {...register("grossWeightKg", { valueAsNumber: true })} />
        <small>{errors.grossWeightKg?.message}</small>
      </label>
      <label className={requiredLabelClass(Boolean(errors.tareWeightKg))}>
        <span className="label-text">Tare Weight (kg)</span>
        <input type="number" step="0.001" {...register("tareWeightKg", { valueAsNumber: true })} />
        <small>{errors.tareWeightKg?.message}</small>
      </label>
      <label>
        Container Number
        <input {...register("containerNumber")} />
      </label>
      <label>
        Seal Number
        <input {...register("sealNumber")} />
      </label>

      {error ? <p className="error-text">{error}</p> : null}
      <button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Shipment"}</button>
    </form>
  );
}

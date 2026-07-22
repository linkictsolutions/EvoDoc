"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiClient } from "@/lib/api/client";
import { DEFAULT_ORG_ID } from "@/lib/config";
import { useToast } from "@/components/ui/toast";
import { FormActionBar } from "@/components/ui/form-action-bar";
import { FormSection } from "@/components/ui/form-section";
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
  const [highlightDirty, setHighlightDirty] = useState(false);
  const lastSavedRef = useRef<ShipmentFormData>({
    vessel: "",
    voyageNo: "",
    bookingReference: "",
    bags: 0,
    grossWeightKg: 0,
    tareWeightKg: 0,
    containerNumber: "",
    sealNumber: "",
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, dirtyFields },
  } = useForm<ShipmentFormData>({
    resolver: zodResolver(shipmentSchema),
    defaultValues: lastSavedRef.current,
  });

  useUnsavedChangesGuard({ enabled: isDirty && !saving, onBlockedNavigation: () => setHighlightDirty(true) });

  const isFieldDirty = useCallback(
    (name: keyof ShipmentFormData) => Boolean((dirtyFields as Record<string, unknown>)[name]),
    [dirtyFields],
  );
  const dirtyControlClass = useCallback(
    (name: keyof ShipmentFormData) => (highlightDirty && isFieldDirty(name) ? "field-error-control" : undefined),
    [highlightDirty, isFieldDirty],
  );

  function requiredLabelClass(hasError: boolean) {
    return hasError ? "is-required field-error" : "is-required";
  }

  function discardChanges() {
    reset(lastSavedRef.current, { keepDirty: false, keepTouched: false });
    setHighlightDirty(false);
    toast.info("Discarded unsaved changes.");
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
      className="form-workspace"
      onSubmit={handleSubmit(onSubmit, () => toast.error("Fill in the required fields."))}
    >
      <FormSection title="Shipment Details" description="Vessel, booking, container, and weight information.">
      <label className="col-6">
        Vessel
        <input className={dirtyControlClass("vessel")} {...register("vessel")} />
      </label>
      <label className="col-3">
        Voyage Number
        <input className={dirtyControlClass("voyageNo")} {...register("voyageNo")} />
      </label>
      <label className={`col-3 ${requiredLabelClass(Boolean(errors.bags))}`}>
        <span className="label-text">Bags</span>
        <input className={dirtyControlClass("bags")} type="number" {...register("bags", { valueAsNumber: true })} />
        <small>{errors.bags?.message}</small>
      </label>
      <label className="col-8">
        Booking Reference
        <input className={dirtyControlClass("bookingReference")} {...register("bookingReference")} />
      </label>
      <label className={`col-4 ${requiredLabelClass(Boolean(errors.grossWeightKg))}`}>
        <span className="label-text">Gross Weight (kg)</span>
        <input
          className={dirtyControlClass("grossWeightKg")}
          type="number"
          step="0.001"
          {...register("grossWeightKg", { valueAsNumber: true })}
        />
        <small>{errors.grossWeightKg?.message}</small>
      </label>
      <label className={`col-4 ${requiredLabelClass(Boolean(errors.tareWeightKg))}`}>
        <span className="label-text">Tare Weight (kg)</span>
        <input
          className={dirtyControlClass("tareWeightKg")}
          type="number"
          step="0.001"
          {...register("tareWeightKg", { valueAsNumber: true })}
        />
        <small>{errors.tareWeightKg?.message}</small>
      </label>
      <label className="col-6">
        Container Number
        <input className={dirtyControlClass("containerNumber")} {...register("containerNumber")} />
      </label>
      <label className="col-2">
        Seal Number
        <input className={dirtyControlClass("sealNumber")} {...register("sealNumber")} />
      </label>
      </FormSection>

      {error ? <p className="error-text">{error}</p> : null}

      <FormActionBar hint={isDirty ? "You have unsaved changes." : undefined}>
        <button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Shipment"}</button>
        <button type="button" className="button-secondary" disabled={!isDirty || saving} onClick={discardChanges}>
          Discard changes
        </button>
      </FormActionBar>
    </form>
  );
}

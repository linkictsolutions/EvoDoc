import { NextRequest } from "next/server";
import {
  assertNoBusinessRuleErrors,
  BusinessRuleError,
  validateShipmentBusinessRules,
} from "@/domain/business-rules";
import { normalizeShipmentPayload } from "@/domain/shipments";
import { shipmentInputSchema } from "@/domain/schemas";
import { requireActor } from "@/lib/auth/server";
import { fail, getRequestId, ok } from "@/lib/api/response";
import {
  appendAuditLog,
  getContract,
  upsertShipment,
} from "@/lib/repositories/firestore-repository";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId();

  try {
    const { id: contractId } = await params;
    const body = await request.json();
    const parsed = shipmentInputSchema.parse({ ...body, contractId });

    const actor = await requireActor(parsed.orgId, ["admin", "editor"]);
    const contract = await getContract(parsed.orgId, contractId);
    const normalized = normalizeShipmentPayload({ ...body, contractId });
    const shipmentRules = validateShipmentBusinessRules(
      {
        id: parsed.shipmentId ?? "draft",
        orgId: parsed.orgId,
        contractId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...normalized.shipment,
      },
      contract,
    );
    assertNoBusinessRuleErrors(shipmentRules);

    const shipmentId = await upsertShipment(
      parsed.orgId,
      contractId,
      parsed.shipmentId,
      {
        ...normalized.shipment,
        validationWarnings: shipmentRules.warnings,
      },
    );

    await appendAuditLog(
      parsed.orgId,
      actor.uid,
      parsed.shipmentId ? "shipment.updated" : "shipment.created",
      `organizations/${parsed.orgId}/contracts/${contractId}/shipments/${shipmentId}`,
      null,
      normalized.shipment,
      requestId,
    );

    return ok(
      requestId,
      {
        shipmentId,
        warnings: shipmentRules.warnings,
      },
      201,
    );
  } catch (error) {
    if (error instanceof BusinessRuleError) {
      return fail(requestId, `${error.message} ${error.issues.join(" ")}`, 422);
    }
    return fail(requestId, (error as Error).message, 400);
  }
}

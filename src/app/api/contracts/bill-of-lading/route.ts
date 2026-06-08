import { NextRequest } from "next/server";
import { validateAndNormalizeBillOfLadingPayload } from "@/domain/contracts";
import { billOfLadingInputSchema } from "@/domain/schemas";
import { requireActor } from "@/lib/auth/server";
import { fail, getRequestId, ok } from "@/lib/api/response";
import {
  appendAuditLog,
  getContract,
  getContractSourceInput,
  resolveContractId,
  upsertContract,
  upsertContractSourceInput,
} from "@/lib/repositories/firestore-repository";
import type { AttachmentRef } from "@/types/models";

export async function POST(request: NextRequest) {
  const requestId = getRequestId();

  try {
    const body = await request.json();
    const parsed = billOfLadingInputSchema.parse(body);
    const actor = await requireActor(parsed.orgId, ["admin", "editor"]);
    const normalized = validateAndNormalizeBillOfLadingPayload(body);
    const resolvedContractId = await resolveContractId(parsed.orgId, parsed.contractId);
    const existing = await getContract(parsed.orgId, resolvedContractId);
    let preservedAttachments: AttachmentRef[] = parsed.attachments ?? [];

    if (parsed.attachments === undefined) {
      try {
        const existingSource = await getContractSourceInput<{ attachments?: AttachmentRef[] }>(
          parsed.orgId,
          resolvedContractId,
          "bill_of_lading_sheet",
        );
        preservedAttachments = Array.isArray(existingSource.payload?.attachments) ? existingSource.payload.attachments : [];
      } catch {
        preservedAttachments = [];
      }
    }

    const mergedBillOfLading = {
      ...existing.billOfLading,
      ...normalized.billOfLading,
    };

    const contractId = await upsertContract(
      parsed.orgId,
      resolvedContractId,
      {
        orgId: existing.orgId,
        contractNumber: existing.contractNumber,
        status: existing.status,
        terms: existing.terms,
        shipping: existing.shipping,
        banking: existing.banking,
        billOfLading: mergedBillOfLading,
        processing: existing.processing,
        derived: existing.derived,
        createdBy: existing.createdBy,
      },
      existing.customerId,
      existing.createdBy || actor.uid,
    );

    await upsertContractSourceInput(
      parsed.orgId,
      contractId,
      "bill_of_lading_sheet",
      {
        ...normalized.billOfLading,
        attachments: preservedAttachments,
      },
      actor.uid,
      requestId,
    );

    await appendAuditLog(
      parsed.orgId,
      actor.uid,
      "contract.bill_of_lading.updated",
      `organizations/${parsed.orgId}/contracts/${contractId}`,
      { billOfLading: existing.billOfLading ?? null },
      { billOfLading: mergedBillOfLading },
      requestId,
    );

    return ok(requestId, { contractId: existing.contractNumber, contractDocId: contractId }, 200);
  } catch (error) {
    return fail(requestId, (error as Error).message, 400);
  }
}

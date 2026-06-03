import { NextRequest } from "next/server";
import { validateAndNormalizeBankLcPayload } from "@/domain/contracts";
import { bankLcInputSchema } from "@/domain/schemas";
import { requireActor } from "@/lib/auth/server";
import { fail, getRequestId, ok } from "@/lib/api/response";
import {
  appendAuditLog,
  getContract,
  resolveContractId,
  upsertContractSourceInput,
  upsertContract,
} from "@/lib/repositories/firestore-repository";

export async function POST(request: NextRequest) {
  const requestId = getRequestId();

  try {
    const body = await request.json();
    const parsed = bankLcInputSchema.parse(body);
    const actor = await requireActor(parsed.orgId, ["admin", "editor"]);
    const normalized = validateAndNormalizeBankLcPayload(body);
    const resolvedContractId = await resolveContractId(parsed.orgId, parsed.contractId);
    const existing = await getContract(parsed.orgId, resolvedContractId);

    const mergedBanking = {
      ...existing.banking,
      ...normalized.banking,
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
        banking: mergedBanking,
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
      "bank_lc_sheet",
      {
        ...normalized.banking,
        attachments: parsed.attachments ?? [],
      },
      actor.uid,
      requestId,
    );

    await appendAuditLog(
      parsed.orgId,
      actor.uid,
      "contract.bank_lc.updated",
      `organizations/${parsed.orgId}/contracts/${contractId}`,
      { banking: existing.banking },
      { banking: mergedBanking },
      requestId,
    );

    return ok(requestId, { contractId: existing.contractNumber, contractDocId: contractId }, 200);
  } catch (error) {
    return fail(requestId, (error as Error).message, 400);
  }
}

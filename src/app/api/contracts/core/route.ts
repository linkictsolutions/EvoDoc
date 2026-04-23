import { NextRequest } from "next/server";
import {
  assertNoBusinessRuleErrors,
  BusinessRuleError,
  validateContractBusinessRules,
} from "@/domain/business-rules";
import { validateAndNormalizeContractCorePayload } from "@/domain/contracts";
import { contractCoreInputSchema } from "@/domain/schemas";
import { requireActor } from "@/lib/auth/server";
import { fail, getRequestId, ok } from "@/lib/api/response";
import {
  appendAuditLog,
  findContractIdByNumber,
  getContract,
  upsertContractSourceInput,
  upsertContract,
  upsertCustomer,
} from "@/lib/repositories/firestore-repository";

export async function POST(request: NextRequest) {
  const requestId = getRequestId();

  try {
    const body = await request.json();
    const parsed = contractCoreInputSchema.parse(body);
    const actor = await requireActor(parsed.orgId, ["admin", "editor"]);
    const normalized = validateAndNormalizeContractCorePayload(body);
    const matchedContractId = parsed.contractId
      ?? await findContractIdByNumber(parsed.orgId, normalized.contract.contractNumber);
    const existingContract = matchedContractId
      ? await getContract(parsed.orgId, matchedContractId).catch(() => undefined)
      : undefined;
    const mergedContract = {
      ...normalized.contract,
      shipping: existingContract?.shipping ?? normalized.contract.shipping,
      banking: existingContract?.banking ?? normalized.contract.banking,
      processing: existingContract?.processing ?? normalized.contract.processing,
      createdBy: existingContract?.createdBy ?? actor.uid,
    };
    const customerDocId = parsed.customer.id ?? existingContract?.customerId;

    const contractRules = validateContractBusinessRules({
      ...mergedContract,
      id: matchedContractId ?? "draft",
      customerId: customerDocId ?? "draft-customer",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: mergedContract.createdBy,
    });
    assertNoBusinessRuleErrors(contractRules);

    const customerId = await upsertCustomer(parsed.orgId, customerDocId, normalized.customer);
    const contractId = await upsertContract(
      parsed.orgId,
      matchedContractId,
      mergedContract,
      customerId,
      actor.uid,
    );
    await upsertContractSourceInput(
      parsed.orgId,
      contractId,
      "contract_sheet",
      {
        customer: normalized.customer,
        contractTerms: normalized.contract.terms,
      },
      actor.uid,
      requestId,
    );

    await appendAuditLog(
      parsed.orgId,
      actor.uid,
      matchedContractId ? "contract.core.updated" : "contract.core.created",
      `organizations/${parsed.orgId}/contracts/${contractId}`,
      null,
      {
        contractId,
        customerId,
        warnings: contractRules.warnings,
      },
      requestId,
    );

    return ok(
      requestId,
      {
        contractId,
        customerId,
        warnings: contractRules.warnings,
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

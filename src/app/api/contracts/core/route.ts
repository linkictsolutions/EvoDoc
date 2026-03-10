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

    const contractRules = validateContractBusinessRules({
      ...normalized.contract,
      id: matchedContractId ?? "draft",
      customerId: parsed.customer.id ?? "draft-customer",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: actor.uid,
    });
    assertNoBusinessRuleErrors(contractRules);

    const customerId = await upsertCustomer(parsed.orgId, parsed.customer.id, normalized.customer);
    const contractId = await upsertContract(
      parsed.orgId,
      matchedContractId,
      normalized.contract,
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

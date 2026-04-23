import { NextRequest } from "next/server";
import { validateAndNormalizeContractPayload } from "@/domain/contracts";
import {
  assertNoBusinessRuleErrors,
  BusinessRuleError,
  validateContractBusinessRules,
} from "@/domain/business-rules";
import { contractInputSchema } from "@/domain/schemas";
import { requireActor } from "@/lib/auth/server";
import { fail, getRequestId, ok } from "@/lib/api/response";
import {
  appendAuditLog,
  deleteContractCascade,
  findContractIdByNumber,
  listContracts,
  resolveContractId,
  upsertContract,
  upsertCustomer,
} from "@/lib/repositories/firestore-repository";

export async function GET(request: NextRequest) {
  const requestId = getRequestId();

  try {
    const orgId = request.nextUrl.searchParams.get("orgId");
    if (!orgId) {
      return fail(requestId, "Missing orgId", 400);
    }

    await requireActor(orgId, ["admin", "editor", "viewer"]);
    const contracts = await listContracts(orgId);

    return ok(requestId, contracts);
  } catch (error) {
    return fail(requestId, (error as Error).message, 403);
  }
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId();

  try {
    const body = await request.json();
    const parsed = contractInputSchema.parse(body);
    const actor = await requireActor(parsed.orgId, ["admin", "editor"]);
    const normalized = validateAndNormalizeContractPayload(body);
    const matchedContractId = parsed.contractId
      ? await resolveContractId(parsed.orgId, parsed.contractId).catch(() => undefined)
      : await findContractIdByNumber(parsed.orgId, normalized.contract.contractNumber);
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
      matchedContractId ?? normalized.contract.contractNumber,
      normalized.contract,
      customerId,
      actor.uid,
    );

    await appendAuditLog(
      parsed.orgId,
      actor.uid,
      matchedContractId ? "contract.updated" : "contract.created",
      `organizations/${parsed.orgId}/contracts/${contractId}`,
      null,
      {
        contractId,
        customerId,
      },
      requestId,
    );

    return ok(
      requestId,
      {
        contractId: normalized.contract.contractNumber,
        contractDocId: contractId,
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

export async function DELETE(request: NextRequest) {
  const requestId = getRequestId();

  try {
    const orgId = request.nextUrl.searchParams.get("orgId");
    const contractId = request.nextUrl.searchParams.get("contractId");
    if (!orgId || !contractId) {
      return fail(requestId, "Missing orgId or contractId", 400);
    }

    const actor = await requireActor(orgId, ["admin", "editor"]);
    const resolvedContractId = await resolveContractId(orgId, contractId);
    const deletion = await deleteContractCascade(orgId, resolvedContractId);

    await appendAuditLog(
      orgId,
      actor.uid,
      "contract.deleted",
      `organizations/${orgId}/contracts/${deletion.contractDocId}`,
      {
        contractNumber: deletion.contractNumber,
      },
      {
        deletedContractDocuments: deletion.deletedContractDocuments,
        deletedAuditLogs: deletion.deletedAuditLogs,
        deletedNotifications: deletion.deletedNotifications,
      },
      requestId,
    );

    return ok(requestId, {
      deleted: true,
      contractId: deletion.contractNumber,
      contractDocId: deletion.contractDocId,
      deletedContractDocuments: deletion.deletedContractDocuments,
      deletedAuditLogs: deletion.deletedAuditLogs,
      deletedNotifications: deletion.deletedNotifications,
    });
  } catch (error) {
    return fail(requestId, (error as Error).message, 400);
  }
}

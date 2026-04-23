import { NextRequest } from "next/server";
import { validateAndNormalizeCustomerMasterPayload } from "@/domain/master-data";
import { customerMasterInputSchema } from "@/domain/schemas";
import { requireActor } from "@/lib/auth/server";
import { fail, getRequestId, ok } from "@/lib/api/response";
import {
  appendAuditLog,
  countContractsByCustomerId,
  getCustomer,
  deleteCustomer,
  listCustomers,
  upsertCustomer,
} from "@/lib/repositories/firestore-repository";

export async function GET(request: NextRequest) {
  const requestId = getRequestId();

  try {
    const orgId = request.nextUrl.searchParams.get("orgId");
    const customerId = request.nextUrl.searchParams.get("customerId");
    if (!orgId) {
      return fail(requestId, "Missing orgId", 400);
    }

    await requireActor(orgId, ["admin", "editor", "viewer"]);

    if (customerId) {
      const customer = await getCustomer(orgId, customerId);
      return ok(requestId, customer);
    }

    const customers = await listCustomers(orgId);
    return ok(requestId, customers);
  } catch (error) {
    return fail(requestId, (error as Error).message, 403);
  }
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId();

  try {
    const body = await request.json();
    const parsed = customerMasterInputSchema.parse(body);
    const actor = await requireActor(parsed.orgId, ["admin", "editor"]);
    const normalized = validateAndNormalizeCustomerMasterPayload(body);
    const customerId = await upsertCustomer(parsed.orgId, parsed.customerId, normalized.customer);

    await appendAuditLog(
      parsed.orgId,
      actor.uid,
      parsed.customerId ? "customer.updated" : "customer.created",
      `organizations/${parsed.orgId}/customers/${customerId}`,
      null,
      {
        customerId,
        name: normalized.customer.name,
      },
      requestId,
    );

    return ok(requestId, { customerId }, 201);
  } catch (error) {
    return fail(requestId, (error as Error).message, 400);
  }
}

export async function DELETE(request: NextRequest) {
  const requestId = getRequestId();

  try {
    const orgId = request.nextUrl.searchParams.get("orgId");
    const customerId = request.nextUrl.searchParams.get("customerId");
    if (!orgId || !customerId) {
      return fail(requestId, "Missing orgId or customerId", 400);
    }

    const actor = await requireActor(orgId, ["admin", "editor"]);
    const linkedContracts = await countContractsByCustomerId(orgId, customerId);

    if (linkedContracts > 0) {
      return fail(
        requestId,
        "Buyer cannot be deleted because it is already linked to existing contracts.",
        409,
      );
    }

    await deleteCustomer(orgId, customerId);

    await appendAuditLog(
      orgId,
      actor.uid,
      "customer.deleted",
      `organizations/${orgId}/customers/${customerId}`,
      null,
      { customerId },
      requestId,
    );

    return ok(requestId, { customerId, deleted: true });
  } catch (error) {
    return fail(requestId, (error as Error).message, 400);
  }
}

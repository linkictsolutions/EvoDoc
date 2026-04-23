import { NextRequest } from "next/server";
import { buildContractSiLcReport } from "@/domain/contract-si-lc";
import { requireActor } from "@/lib/auth/server";
import { fail, getRequestId, ok } from "@/lib/api/response";
import { getContract, getCustomer, resolveContractId } from "@/lib/repositories/firestore-repository";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId();

  try {
    const { id } = await params;
    const orgId = request.nextUrl.searchParams.get("orgId");
    if (!orgId) {
      return fail(requestId, "Missing orgId", 400);
    }

    await requireActor(orgId, ["admin", "editor", "viewer"]);
    const resolvedContractId = await resolveContractId(orgId, id);
    const contract = await getContract(orgId, resolvedContractId);
    const customer = await getCustomer(orgId, contract.customerId);
    const report = buildContractSiLcReport(contract, customer);

    return ok(requestId, report);
  } catch (error) {
    return fail(requestId, (error as Error).message, 400);
  }
}

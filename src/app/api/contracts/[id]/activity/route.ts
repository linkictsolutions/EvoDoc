import { NextRequest } from "next/server";
import { requireActor } from "@/lib/auth/server";
import { fail, getRequestId, ok } from "@/lib/api/response";
import { listContractAuditLogs, resolveContractId } from "@/lib/repositories/firestore-repository";

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
    const logs = await listContractAuditLogs(orgId, resolvedContractId);
    return ok(requestId, logs);
  } catch (error) {
    return fail(requestId, (error as Error).message, 400);
  }
}

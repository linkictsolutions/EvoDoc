import { NextRequest } from "next/server";
import { requireActor } from "@/lib/auth/server";
import { fail, getRequestId, ok } from "@/lib/api/response";
import {
  appendAuditLog,
  markGeneratedDocumentFinal,
  resolveContractId,
} from "@/lib/repositories/firestore-repository";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId();

  try {
    const { id: docId } = await params;
    const body = await request.json();
    const orgId = body.orgId as string | undefined;
    const contractId = body.contractId as string | undefined;

    if (!orgId || !contractId) {
      return fail(requestId, "Missing orgId or contractId", 400);
    }

    const actor = await requireActor(orgId, ["admin", "editor"]);
    const resolvedContractId = await resolveContractId(orgId, contractId);

    await markGeneratedDocumentFinal(orgId, resolvedContractId, docId, actor.uid);

    await appendAuditLog(
      orgId,
      actor.uid,
      "document.marked_final",
      `organizations/${orgId}/contracts/${resolvedContractId}/documents/${docId}`,
      null,
      {
        docId,
        contractId: resolvedContractId,
        isFinal: true,
      },
      requestId,
    );

    return ok(requestId, { markedFinal: true });
  } catch (error) {
    return fail(requestId, (error as Error).message, 400);
  }
}

import { NextRequest } from "next/server";
import { requireActor } from "@/lib/auth/server";
import { fail, getRequestId, ok } from "@/lib/api/response";
import { getGeneratedDocument, resolveContractId } from "@/lib/repositories/firestore-repository";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId();

  try {
    const { id: docId } = await params;
    const orgId = request.nextUrl.searchParams.get("orgId");
    const contractId = request.nextUrl.searchParams.get("contractId");

    if (!orgId || !contractId) {
      return fail(requestId, "Missing orgId or contractId", 400);
    }

    await requireActor(orgId, ["admin", "editor", "viewer"]);
    const resolvedContractId = await resolveContractId(orgId, contractId);
    const document = await getGeneratedDocument(orgId, resolvedContractId, docId);

    return ok(requestId, {
      id: document.id,
      docType: document.docType,
      docVariant: document.docVariant,
      revisionNumber: document.revisionNumber,
      status: document.status,
      isFinal: document.isFinal ?? false,
      snapshotHash: document.snapshotHash,
      approvedSnapshotHash: document.approvedSnapshotHash,
      validationWarnings: document.validationWarnings ?? [],
      templateLayout: document.templateLayout,
      outputSnapshot: document.outputSnapshot,
      inputSnapshot: document.inputSnapshot,
    });
  } catch (error) {
    return fail(requestId, (error as Error).message, 400);
  }
}

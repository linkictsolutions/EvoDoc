import { NextRequest } from "next/server";
import { requireActor } from "@/lib/auth/server";
import { fail, getRequestId, ok } from "@/lib/api/response";
import { getGeneratedDocument } from "@/lib/repositories/firestore-repository";

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
    const document = await getGeneratedDocument(orgId, contractId, docId);

    return ok(requestId, {
      id: document.id,
      docType: document.docType,
      docVariant: document.docVariant,
      revisionNumber: document.revisionNumber,
      status: document.status,
      snapshotHash: document.snapshotHash,
      approvedSnapshotHash: document.approvedSnapshotHash,
      validationWarnings: document.validationWarnings ?? [],
      outputSnapshot: document.outputSnapshot,
      inputSnapshot: document.inputSnapshot,
    });
  } catch (error) {
    return fail(requestId, (error as Error).message, 400);
  }
}

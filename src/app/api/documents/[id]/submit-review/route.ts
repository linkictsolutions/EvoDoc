import { NextRequest } from "next/server";
import { submitReviewSchema } from "@/domain/schemas";
import { requireActor } from "@/lib/auth/server";
import { fail, getRequestId, ok } from "@/lib/api/response";
import {
  appendAuditLog,
  createNotification,
  transitionDocument,
} from "@/lib/repositories/firestore-repository";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId();

  try {
    const { id: docId } = await params;
    const body = await request.json();
    const parsed = submitReviewSchema.parse(body);

    const actor = await requireActor(parsed.orgId, ["admin", "editor"]);

    await transitionDocument(parsed.orgId, parsed.contractId, docId, "under_review", actor);

    await createNotification(parsed.orgId, {
      orgId: parsed.orgId,
      type: "review_requested",
      title: "Document review requested",
      message: `Document ${docId} has been submitted for review by ${actor.email}.`,
      targetPath: `/app/contracts/${parsed.contractId}/documents/generated/${docId}/review`,
      read: false,
      createdAt: new Date().toISOString(),
    });

    await appendAuditLog(
      parsed.orgId,
      actor.uid,
      "document.submitted_for_review",
      `organizations/${parsed.orgId}/contracts/${parsed.contractId}/documents/${docId}`,
      null,
      { status: "under_review" },
      requestId,
    );

    return ok(requestId, { docId, status: "under_review" });
  } catch (error) {
    return fail(requestId, (error as Error).message, 400);
  }
}

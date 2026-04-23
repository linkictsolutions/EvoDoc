import { NextRequest } from "next/server";
import { decisionSchema } from "@/domain/schemas";
import { requireActor } from "@/lib/auth/server";
import { fail, getRequestId, ok } from "@/lib/api/response";
import {
  appendAuditLog,
  createNotification,
  resolveContractId,
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
    const parsed = decisionSchema.parse(body);
    const resolvedContractId = await resolveContractId(parsed.orgId, parsed.contractId);
    const actor = await requireActor(parsed.orgId, ["admin"]);

    if (!actor.isApprover) {
      return fail(requestId, "Only approvers can make review decisions", 403);
    }

    const targetStatus = parsed.decision === "approve" ? "approved" : "draft";

    await transitionDocument(parsed.orgId, resolvedContractId, docId, targetStatus, actor, parsed.comment);

    await createNotification(parsed.orgId, {
      orgId: parsed.orgId,
      type: parsed.decision === "approve" ? "approved" : "rejected",
      title: parsed.decision === "approve" ? "Document approved" : "Document returned to draft",
      message: parsed.comment,
      targetPath: `/app/contracts/${parsed.contractId}/documents/generated/${docId}/review`,
      read: false,
      createdAt: new Date().toISOString(),
    });

    await appendAuditLog(
      parsed.orgId,
      actor.uid,
      parsed.decision === "approve" ? "document.approved" : "document.rejected",
      `organizations/${parsed.orgId}/contracts/${resolvedContractId}/documents/${docId}`,
      null,
      {
        status: targetStatus,
        comment: parsed.comment,
      },
      requestId,
    );

    return ok(requestId, {
      docId,
      status: targetStatus,
    });
  } catch (error) {
    return fail(requestId, (error as Error).message, 400);
  }
}

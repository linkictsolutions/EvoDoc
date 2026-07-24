import { NextRequest } from "next/server";
import { requireActor } from "@/lib/auth/server";
import { fail, getRequestId, ok } from "@/lib/api/response";
import {
  appendAuditLog,
  deleteDocumentTemplate,
  getDocumentTemplate,
} from "@/lib/repositories/firestore-repository";

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
    const template = await getDocumentTemplate(orgId, id);

    return ok(requestId, template);
  } catch (error) {
    return fail(requestId, (error as Error).message, 404);
  }
}

export async function DELETE(
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

    const actor = await requireActor(orgId, ["admin", "editor"]);
    const deleted = await deleteDocumentTemplate(orgId, id);

    await appendAuditLog(
      orgId,
      actor.uid,
      "documentTemplate.deleted",
      `organizations/${orgId}/documentTemplates/${id}`,
      {
        name: deleted.name,
        docType: deleted.docType,
      },
      null,
      requestId,
    );

    return ok(requestId, { deleted: true, id });
  } catch (error) {
    return fail(requestId, (error as Error).message, 400);
  }
}

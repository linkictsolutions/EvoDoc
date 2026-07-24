import { NextRequest } from "next/server";
import { documentTemplateInputSchema } from "@/domain/schemas";
import { parseTemplateLayout } from "@/domain/template-layout";
import { requireActor } from "@/lib/auth/server";
import { fail, getRequestId, ok } from "@/lib/api/response";
import {
  appendAuditLog,
  createDocumentTemplate,
  listDocumentTemplates,
} from "@/lib/repositories/firestore-repository";

export async function GET(request: NextRequest) {
  const requestId = getRequestId();

  try {
    const orgId = request.nextUrl.searchParams.get("orgId");
    const docType = request.nextUrl.searchParams.get("docType") ?? undefined;
    if (!orgId) {
      return fail(requestId, "Missing orgId", 400);
    }

    await requireActor(orgId, ["admin", "editor", "viewer"]);
    const templates = await listDocumentTemplates(orgId, docType);

    return ok(requestId, templates);
  } catch (error) {
    return fail(requestId, (error as Error).message, 403);
  }
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId();

  try {
    const body = await request.json();
    const parsed = documentTemplateInputSchema.parse(body);
    const actor = await requireActor(parsed.orgId, ["admin", "editor"]);

    if (!parseTemplateLayout(parsed.layout)) {
      return fail(requestId, "Invalid template layout payload", 400);
    }

    const templateId = await createDocumentTemplate(parsed.orgId, {
      orgId: parsed.orgId,
      docType: parsed.docType,
      name: parsed.name.trim(),
      layout: parsed.layout,
      createdBy: actor.uid,
    });

    await appendAuditLog(
      parsed.orgId,
      actor.uid,
      "documentTemplate.created",
      `organizations/${parsed.orgId}/documentTemplates/${templateId}`,
      null,
      {
        templateId,
        docType: parsed.docType,
        name: parsed.name.trim(),
      },
      requestId,
    );

    return ok(requestId, { templateId }, 201);
  } catch (error) {
    return fail(requestId, (error as Error).message, 400);
  }
}

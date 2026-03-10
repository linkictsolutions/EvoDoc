import { NextRequest } from "next/server";
import { validateAndNormalizeItemMasterPayload } from "@/domain/master-data";
import { itemMasterInputSchema } from "@/domain/schemas";
import { requireActor } from "@/lib/auth/server";
import { fail, getRequestId, ok } from "@/lib/api/response";
import {
  appendAuditLog,
  listItems,
  upsertItem,
} from "@/lib/repositories/firestore-repository";

export async function GET(request: NextRequest) {
  const requestId = getRequestId();

  try {
    const orgId = request.nextUrl.searchParams.get("orgId");
    if (!orgId) {
      return fail(requestId, "Missing orgId", 400);
    }

    await requireActor(orgId, ["admin", "editor", "viewer"]);
    const items = await listItems(orgId);
    return ok(requestId, items);
  } catch (error) {
    return fail(requestId, (error as Error).message, 403);
  }
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId();

  try {
    const body = await request.json();
    const parsed = itemMasterInputSchema.parse(body);
    const actor = await requireActor(parsed.orgId, ["admin", "editor"]);
    const normalized = validateAndNormalizeItemMasterPayload(body);
    const itemId = await upsertItem(parsed.orgId, parsed.itemId, normalized.item);

    await appendAuditLog(
      parsed.orgId,
      actor.uid,
      parsed.itemId ? "item.updated" : "item.created",
      `organizations/${parsed.orgId}/items/${itemId}`,
      null,
      {
        itemId,
        itemCode: normalized.item.itemCode,
      },
      requestId,
    );

    return ok(requestId, { itemId }, 201);
  } catch (error) {
    return fail(requestId, (error as Error).message, 400);
  }
}

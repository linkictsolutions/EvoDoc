import { NextRequest } from "next/server";
import {
  defaultBookingsSheet,
  normalizeBookingsPayload,
  syncBookingEntryPairs,
} from "@/domain/execution";
import { requireActor } from "@/lib/auth/server";
import { fail, getRequestId, ok } from "@/lib/api/response";
import {
  appendAuditLog,
  getBookingsSheet,
  upsertBookingsSheet,
} from "@/lib/repositories/firestore-repository";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId();

  try {
    const { id: contractId } = await params;
    const orgId = request.nextUrl.searchParams.get("orgId");
    if (!orgId) {
      return fail(requestId, "Missing orgId", 400);
    }

    await requireActor(orgId, ["admin", "editor", "viewer"]);
    const bookings = await getBookingsSheet(orgId, contractId).catch(() => defaultBookingsSheet(orgId, contractId));
    const payload = {
      ...bookings,
      entries: syncBookingEntryPairs(bookings.entries),
    };
    return ok(requestId, payload);
  } catch (error) {
    return fail(requestId, (error as Error).message, 400);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId();

  try {
    const { id: contractId } = await params;
    const body = await request.json();
    const normalized = normalizeBookingsPayload({ ...body, contractId });
    const actor = await requireActor(normalized.bookings.orgId, ["admin", "editor"]);
    const targetPath = await upsertBookingsSheet(normalized.bookings.orgId, contractId, normalized.bookings);

    await appendAuditLog(
      normalized.bookings.orgId,
      actor.uid,
      "execution.bookings.updated",
      targetPath,
      null,
      normalized.bookings,
      requestId,
    );

    return ok(requestId, { saved: true, targetPath });
  } catch (error) {
    return fail(requestId, (error as Error).message, 400);
  }
}

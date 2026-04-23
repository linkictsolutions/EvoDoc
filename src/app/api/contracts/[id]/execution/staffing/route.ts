import { NextRequest } from "next/server";
import {
  buildDefaultStaffingInstructionRows,
  deriveFinalStaffingRows,
  normalizeStaffingPayload,
  syncStaffingInstructionRows,
} from "@/domain/execution";
import { requireActor } from "@/lib/auth/server";
import { fail, getRequestId, ok } from "@/lib/api/response";
import {
  appendAuditLog,
  getBookingsSheet,
  getStaffingSheet,
  upsertStaffingSheet,
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
    const [bookings, staffing] = await Promise.all([
      getBookingsSheet(orgId, contractId).catch(() => undefined),
      getStaffingSheet(orgId, contractId).catch(() => undefined),
    ]);

    const instructionRows = syncStaffingInstructionRows(bookings, staffing?.instructionRows);
    const payload = staffing
      ? { ...staffing, instructionRows }
      : {
          orgId,
          contractId,
          instructionRows: buildDefaultStaffingInstructionRows(bookings),
          createdAt: new Date(0).toISOString(),
          updatedAt: new Date(0).toISOString(),
        };

    return ok(requestId, {
      ...payload,
      finalRows: deriveFinalStaffingRows(payload),
    });
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
    const normalized = normalizeStaffingPayload({ ...body, contractId });
    const actor = await requireActor(normalized.staffing.orgId, ["admin", "editor"]);
    const targetPath = await upsertStaffingSheet(normalized.staffing.orgId, contractId, normalized.staffing);

    await appendAuditLog(
      normalized.staffing.orgId,
      actor.uid,
      "execution.staffing.updated",
      targetPath,
      null,
      normalized.staffing,
      requestId,
    );

    return ok(requestId, { saved: true, targetPath });
  } catch (error) {
    return fail(requestId, (error as Error).message, 400);
  }
}

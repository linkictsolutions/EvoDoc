import { NextRequest } from "next/server";
import { defaultProcessingSheet, normalizeProcessingPayload } from "@/domain/execution";
import { requireActor } from "@/lib/auth/server";
import { fail, getRequestId, ok } from "@/lib/api/response";
import {
  appendAuditLog,
  getContract,
  getProcessingSheet,
  upsertProcessingSheet,
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
    const processing = await getProcessingSheet(orgId, contractId).catch(async () => {
      const contract = await getContract(orgId, contractId);
      return {
        ...defaultProcessingSheet(orgId, contractId),
        moisturePercent: contract.processing.moisturePercent,
        stationName: contract.processing.stationName,
        stationAddress: contract.processing.stationAddress,
      };
    });

    return ok(requestId, processing);
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
    const normalized = normalizeProcessingPayload({ ...body, contractId });
    const actor = await requireActor(normalized.processing.orgId, ["admin", "editor"]);
    const targetPath = await upsertProcessingSheet(normalized.processing.orgId, contractId, normalized.processing);

    await appendAuditLog(
      normalized.processing.orgId,
      actor.uid,
      "execution.processing.updated",
      targetPath,
      null,
      normalized.processing,
      requestId,
    );

    return ok(requestId, { saved: true, targetPath });
  } catch (error) {
    return fail(requestId, (error as Error).message, 400);
  }
}

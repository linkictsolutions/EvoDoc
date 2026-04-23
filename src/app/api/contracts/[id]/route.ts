import { NextRequest } from "next/server";
import { hydrateExecutionData } from "@/domain/execution";
import { requireActor } from "@/lib/auth/server";
import { fail, getRequestId, ok } from "@/lib/api/response";
import { adminDb } from "@/lib/firebase/admin";
import { getContract, getCustomer, getExecutionData } from "@/lib/repositories/firestore-repository";

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
    const contract = await getContract(orgId, id);
    const customer = await getCustomer(orgId, contract.customerId).catch(() => null);

    const shipmentSnap = await adminDb
      .collection(`organizations/${orgId}/contracts/${id}/shipments`)
      .orderBy("updatedAt", "desc")
      .get();

    const documentSnap = await adminDb
      .collection(`organizations/${orgId}/contracts/${id}/documents`)
      .orderBy("updatedAt", "desc")
      .get();

    const executionData = hydrateExecutionData(await getExecutionData(orgId, id).catch(() => ({})));

    return ok(requestId, {
      contract,
      customer,
      shipments: shipmentSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
      documents: documentSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
      executionData,
    });
  } catch (error) {
    return fail(requestId, (error as Error).message, 400);
  }
}

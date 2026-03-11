import { NextRequest } from "next/server";
import { buildCommercialInvoiceIccSample } from "@/domain/commercial-invoice-icc";
import { requireActor } from "@/lib/auth/server";
import { fail, getRequestId, ok } from "@/lib/api/response";
import { adminDb } from "@/lib/firebase/admin";
import { getCompanyConfiguration, getContract, getCustomer } from "@/lib/repositories/firestore-repository";
import type { Shipment } from "@/types/models";

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
    const customer = await getCustomer(orgId, contract.customerId);

    const shipmentSnap = await adminDb
      .collection(`organizations/${orgId}/contracts/${id}/shipments`)
      .orderBy("updatedAt", "desc")
      .limit(1)
      .get();

    const latestShipment = shipmentSnap.empty
      ? undefined
      : ({ id: shipmentSnap.docs[0].id, ...shipmentSnap.docs[0].data() } as Shipment);

    const companyConfiguration = await getCompanyConfiguration(orgId).catch(() => undefined);
    const sample = buildCommercialInvoiceIccSample(contract, customer, latestShipment, companyConfiguration);
    return ok(requestId, sample);
  } catch (error) {
    return fail(requestId, (error as Error).message, 400);
  }
}

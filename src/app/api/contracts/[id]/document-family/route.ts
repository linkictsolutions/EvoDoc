import { NextRequest } from "next/server";
import { z } from "zod";
import { validateDocumentGenerationRules } from "@/domain/business-rules";
import {
  getDocumentFamilyDefinition,
  makePreviewShipment,
  resolveDocumentFamily,
} from "@/domain/documents/catalog";
import { buildExecutionShipment, hydrateExecutionData } from "@/domain/execution";
import { requireActor } from "@/lib/auth/server";
import { fail, getRequestId, ok } from "@/lib/api/response";
import {
  getExecutionData,
  getCompanyConfiguration,
  getContract,
  getCustomer,
  listGeneratedDocuments,
  resolveContractId,
} from "@/lib/repositories/firestore-repository";
import { buildDocumentOutput } from "@/lib/workflow/document-generation";
import type { DocumentFamily } from "@/types/models";

const querySchema = z.object({
  family: z.enum([
    "commercial_invoice",
    "packing_list",
    "shipping_instruction",
    "certificate_of_quality",
    "certificate_of_weight",
    "way_bill",
  ]),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId();

  try {
    const { id: contractIdentifier } = await params;
    const orgId = request.nextUrl.searchParams.get("orgId");
    if (!orgId) {
      return fail(requestId, "Missing orgId", 400);
    }

    const parsed = querySchema.parse({
      family: request.nextUrl.searchParams.get("family"),
    });

    await requireActor(orgId, ["admin", "editor", "viewer"]);

    const family = parsed.family as DocumentFamily;
    const familyDefinition = getDocumentFamilyDefinition(family);

    const contractId = await resolveContractId(orgId, contractIdentifier);

    const [contract, documents, execution] = await Promise.all([
      getContract(orgId, contractId),
      listGeneratedDocuments(orgId, contractId),
      getExecutionData(orgId, contractId),
    ]);

    const [customer, companyConfiguration] = await Promise.all([
      getCustomer(orgId, contract.customerId),
      getCompanyConfiguration(orgId).catch(() => undefined),
    ]);
    const executionData = hydrateExecutionData(execution);
    const hasBookingHeader = Boolean(
      executionData.bookings?.bookingNumber
      || executionData.bookings?.billOfLadingNumber
      || executionData.bookings?.vesselName
      || executionData.bookings?.voyageNo,
    );
    const hasExecutionRows = Boolean(
      executionData.bookings?.entries.some(
        (entry) => entry.containerNumber || entry.sealNumber || entry.secondSealNumber || entry.tareWeightKg,
      )
      || executionData.staffing?.finalRows.some(
        (row) =>
          row.containerNumber
          || row.sealNumber
          || row.netWeightKg
          || row.plateNo
          || row.driverName
          || row.certNumber,
      ),
    );
    const hasExecutionData = hasBookingHeader || hasExecutionRows;
    const latestShipmentId = hasExecutionData ? "execution-derived" : undefined;
    const shipment = hasExecutionData
      ? buildExecutionShipment(contract, companyConfiguration, executionData)
      : makePreviewShipment(contractId, orgId);

    const revisions = documents
      .filter((document) => {
        const existingFamily = document.documentFamily ?? resolveDocumentFamily(document.docType);
        return existingFamily === family;
      })
      .map((document) => ({
        id: document.id,
        title: document.outputSnapshot.title,
        status: document.status,
        revisionNumber: document.revisionNumber ?? 1,
        generatedAt: document.generatedAt,
        isFinal: Boolean(document.isFinal),
      }));

    const canPreview = family === "commercial_invoice"
      ? true
      : Boolean(latestShipmentId);

    const currentPreview = canPreview
        ? buildDocumentOutput(familyDefinition.docType, {
          docType: familyDefinition.docType,
          contract,
          customer,
          shipment,
          companyConfiguration,
          executionData,
        })
      : null;

    const previewRules = currentPreview
      ? validateDocumentGenerationRules({
          docType: familyDefinition.docType,
          contract,
          customer,
          shipment,
          executionData,
        })
      : null;

    return ok(requestId, {
      family,
      familyLabel: familyDefinition.label,
      docType: familyDefinition.docType,
      latestShipmentId: latestShipmentId ?? null,
      currentPreview,
      previewWarnings: previewRules?.warnings ?? [],
      unavailableReason: canPreview ? null : "Add execution data in Bookings, Staffing, or Processing to preview this document.",
      revisions,
      documentRevisionCount: documents.filter((document) => {
        const existingFamily = document.documentFamily ?? resolveDocumentFamily(document.docType);
        return existingFamily === family;
      }).length,
    });
  } catch (error) {
    return fail(requestId, (error as Error).message, 400);
  }
}

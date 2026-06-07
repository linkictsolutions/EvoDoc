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
  appendAuditLog,
  getExecutionData,
  getCompanyConfiguration,
  getContract,
  getCustomer,
  listGeneratedDocuments,
  resolveContractId,
  setContractDocumentRef,
  setContractIcoOverrides,
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
    "ico_certificate",
    "bill_of_lading",
  ]),
});

const bodySchema = z.object({
  orgId: z.string().min(1),
  family: z.enum([
    "commercial_invoice",
    "packing_list",
    "shipping_instruction",
    "certificate_of_quality",
    "certificate_of_weight",
    "way_bill",
    "ico_certificate",
    "bill_of_lading",
  ]),
  refNo: z.string(),
  icoOverrides: z.object({
    exporterConsignor: z.string().optional(),
    notifyAddress: z.string().optional(),
    internalReferenceNo: z.string().optional(),
    countryCode: z.string().optional(),
    portCode: z.string().optional(),
    serialNo: z.string().optional(),
    producingCountry: z.string().optional(),
    countryDestination: z.string().optional(),
    dateOfExport: z.string().optional(),
    countryTransShipment: z.string().optional(),
    nameOfCarrier: z.string().optional(),
    icoIdentificationMark: z.string().optional(),
    otherMarksIcoNo: z.string().optional(),
    otherMarksCertNo: z.string().optional(),
    descriptionOtherSpecify: z.string().optional(),
    partBText: z.string().optional(),
    issuingDate: z.string().optional(),
    certifyingDate: z.string().optional(),
    place: z.string().optional(),
  }).optional(),
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
      || family === "packing_list"
      || family === "ico_certificate"
      || family === "bill_of_lading"
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
      refNo: contract.documentRefs?.[family] ?? "",
      icoOverrides: contract.icoOverrides ?? null,
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId();

  try {
    const body = await request.json();
    const parsed = bodySchema.parse(body);
    const actor = await requireActor(parsed.orgId, ["admin", "editor"]);
    const { id: contractIdentifier } = await params;
    const contractId = await resolveContractId(parsed.orgId, contractIdentifier);
    const normalizedRefNo = await setContractDocumentRef(parsed.orgId, contractId, parsed.family, parsed.refNo);
    let savedOverrides = null;
    if (parsed.family === "ico_certificate" && parsed.icoOverrides) {
      savedOverrides = await setContractIcoOverrides(parsed.orgId, contractId, parsed.icoOverrides);
    }

    await appendAuditLog(
      parsed.orgId,
      actor.uid,
      "contract.document_ref.updated",
      `organizations/${parsed.orgId}/contracts/${contractId}`,
      null,
      {
        family: parsed.family,
        refNo: normalizedRefNo,
        ...(savedOverrides ? { icoOverrides: savedOverrides } : {}),
      },
      requestId,
    );

    return ok(requestId, {
      family: parsed.family,
      refNo: normalizedRefNo,
      icoOverrides: savedOverrides,
    });
  } catch (error) {
    return fail(requestId, (error as Error).message, 400);
  }
}

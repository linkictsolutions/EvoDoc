import { NextRequest } from "next/server";
import {
  assertNoBusinessRuleErrors,
  BusinessRuleError,
  validateDocumentGenerationRules,
} from "@/domain/business-rules";
import { generateDocumentSchema } from "@/domain/schemas";
import { requireActor } from "@/lib/auth/server";
import { fail, getRequestId, ok } from "@/lib/api/response";
import {
  appendAuditLog,
  createGeneratedDocument,
  getCompanyConfiguration,
  getContract,
  getCustomer,
  getExecutionData,
  listGeneratedDocuments,
  resolveContractId,
} from "@/lib/repositories/firestore-repository";
import {
  defaultVariantForFamily,
  makePreviewShipment,
  resolveDocumentFamily,
  resolveVariantForFamily,
} from "@/domain/documents/catalog";
import { buildExecutionShipment, hydrateExecutionData } from "@/domain/execution";
import { buildDocumentOutput, makeGeneratedDocumentPayload } from "@/lib/workflow/document-generation";

export async function POST(request: NextRequest) {
  const requestId = getRequestId();

  try {
    const body = await request.json();
    const parsed = generateDocumentSchema.parse(body);
    const actor = await requireActor(parsed.orgId, ["admin", "editor"]);
    const documentFamily = resolveDocumentFamily(parsed.docType);
    const docVariant = resolveVariantForFamily(
      documentFamily,
      (parsed.docVariant ?? defaultVariantForFamily()),
    );

    const resolvedContractId = await resolveContractId(parsed.orgId, parsed.contractId);

    const [contract, execution, existingDocuments] = await Promise.all([
      getContract(parsed.orgId, resolvedContractId),
      getExecutionData(parsed.orgId, resolvedContractId),
      listGeneratedDocuments(parsed.orgId, resolvedContractId),
    ]);

    const [customer, companyConfiguration] = await Promise.all([
      getCustomer(parsed.orgId, contract.customerId),
      getCompanyConfiguration(parsed.orgId).catch(() => undefined),
    ]);
    const executionData = hydrateExecutionData(execution);
    const hasBookingHeader = Boolean(
      executionData.bookings?.bookingNumber
      || executionData.bookings?.billOfLadingNumber
      || executionData.bookings?.vesselName
      || executionData.bookings?.voyageNo,
    );
    const executionShipment = buildExecutionShipment(contract, companyConfiguration, executionData);
    const hasExecutionData = Boolean(
      hasBookingHeader
      || 
      executionData.bookings?.entries.some(
        (entry) => entry.containerNumber || entry.sealNumber || entry.secondSealNumber || entry.tareWeightKg,
      ) || executionData.staffing?.finalRows.some(
        (row) =>
          row.containerNumber
          || row.sealNumber
          || row.netWeightKg
          || row.plateNo
          || row.driverName
          || row.certNumber,
      ),
    );
    const shipment = hasExecutionData
      ? executionShipment
      : makePreviewShipment(resolvedContractId, parsed.orgId);
    const revisionNumber =
      existingDocuments.filter((document) => {
        const existingFamily = document.documentFamily ?? resolveDocumentFamily(document.docType);
        return existingFamily === documentFamily;
      }).length + 1;

    const inputSnapshot = {
      docType: parsed.docType,
      docVariant,
      contract,
      customer,
      shipment,
      companyConfiguration,
      executionData,
    };
    const generationRules = validateDocumentGenerationRules(inputSnapshot);
    assertNoBusinessRuleErrors(generationRules);

    const outputSnapshot = buildDocumentOutput(parsed.docType, inputSnapshot);
    const payload = makeGeneratedDocumentPayload({
      docType: parsed.docType,
      docVariant,
      templateVersion: parsed.templateVersion,
      templateLayout: parsed.templateLayout,
      inputSnapshot,
      outputSnapshot,
      shipmentId: parsed.shipmentId === "execution-derived" ? undefined : parsed.shipmentId,
      generatedBy: actor.uid,
      revisionNumber,
      validationWarnings: generationRules.warnings,
    });

    const docId = await createGeneratedDocument(parsed.orgId, resolvedContractId, payload);

    await appendAuditLog(
      parsed.orgId,
      actor.uid,
      "document.generated",
      `organizations/${parsed.orgId}/contracts/${resolvedContractId}/documents/${docId}`,
      null,
      {
        docType: parsed.docType,
        docVariant,
        documentFamily,
        revisionNumber,
        templateVersion: parsed.templateVersion,
      },
      requestId,
    );

    return ok(
      requestId,
      {
        docId,
        status: payload.status,
        warnings: generationRules.warnings,
      },
      201,
    );
  } catch (error) {
    if (error instanceof BusinessRuleError) {
      return fail(requestId, `${error.message} ${error.issues.join(" ")}`, 422);
    }
    return fail(requestId, (error as Error).message, 400);
  }
}

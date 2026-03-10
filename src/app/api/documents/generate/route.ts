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
  getContract,
  getCustomer,
  getShipment,
  listGeneratedDocuments,
} from "@/lib/repositories/firestore-repository";
import { defaultVariantForFamily, makePreviewShipment, resolveDocumentFamily } from "@/domain/documents/catalog";
import { buildDocumentOutput, makeGeneratedDocumentPayload } from "@/lib/workflow/document-generation";

export async function POST(request: NextRequest) {
  const requestId = getRequestId();

  try {
    const body = await request.json();
    const parsed = generateDocumentSchema.parse(body);
    const actor = await requireActor(parsed.orgId, ["admin", "editor"]);
    const documentFamily = resolveDocumentFamily(parsed.docType);
    const docVariant = parsed.docVariant ?? defaultVariantForFamily(documentFamily);

    const [contract, shipment, existingDocuments] = await Promise.all([
      getContract(parsed.orgId, parsed.contractId),
      parsed.shipmentId
        ? getShipment(parsed.orgId, parsed.contractId, parsed.shipmentId)
        : Promise.resolve(makePreviewShipment(parsed.contractId, parsed.orgId)),
      listGeneratedDocuments(parsed.orgId, parsed.contractId),
    ]);

    const customer = await getCustomer(parsed.orgId, contract.customerId);
    const revisionNumber =
      existingDocuments.filter((document) => {
        const existingFamily = document.documentFamily ?? resolveDocumentFamily(document.docType);
        const existingVariant =
          document.docVariant ?? (existingFamily === "commercial_invoice" ? "final" : "standard");

        return existingFamily === documentFamily && existingVariant === docVariant;
      }).length + 1;

    const inputSnapshot = {
      docType: parsed.docType,
      docVariant,
      contract,
      customer,
      shipment,
    };
    const generationRules = validateDocumentGenerationRules(inputSnapshot);
    assertNoBusinessRuleErrors(generationRules);

    const outputSnapshot = buildDocumentOutput(parsed.docType, inputSnapshot);
    const payload = makeGeneratedDocumentPayload({
      docType: parsed.docType,
      docVariant,
      templateVersion: parsed.templateVersion,
      inputSnapshot,
      outputSnapshot,
      shipmentId: parsed.shipmentId,
      generatedBy: actor.uid,
      revisionNumber,
      validationWarnings: generationRules.warnings,
    });

    const docId = await createGeneratedDocument(parsed.orgId, parsed.contractId, payload);

    await appendAuditLog(
      parsed.orgId,
      actor.uid,
      "document.generated",
      `organizations/${parsed.orgId}/contracts/${parsed.contractId}/documents/${docId}`,
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

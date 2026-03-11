import { NextRequest } from "next/server";
import { z } from "zod";
import { validateDocumentGenerationRules } from "@/domain/business-rules";
import {
  displayVariant,
  getDocumentFamilyDefinition,
  makePreviewShipment,
  resolveDocumentFamily,
  resolveVariantForFamily,
} from "@/domain/documents/catalog";
import { requireActor } from "@/lib/auth/server";
import { fail, getRequestId, ok } from "@/lib/api/response";
import { adminDb } from "@/lib/firebase/admin";
import {
  getCompanyConfiguration,
  getContract,
  getCustomer,
  getShipment,
  listGeneratedDocuments,
} from "@/lib/repositories/firestore-repository";
import { buildDocumentOutput } from "@/lib/workflow/document-generation";
import type { DocumentFamily, DocumentVariant } from "@/types/models";

const querySchema = z.object({
  family: z.enum(["commercial_invoice", "packing_list", "shipping_instruction"]),
  variant: z.enum(["permit", "final", "standard"]).optional(),
});

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

    const parsed = querySchema.parse({
      family: request.nextUrl.searchParams.get("family"),
      variant: request.nextUrl.searchParams.get("variant") ?? undefined,
    });

    await requireActor(orgId, ["admin", "editor", "viewer"]);

    const family = parsed.family as DocumentFamily;
    const familyDefinition = getDocumentFamilyDefinition(family);
    const variant = resolveVariantForFamily(family, parsed.variant as DocumentVariant | undefined);

    const [contract, documents, shipmentSnap] = await Promise.all([
      getContract(orgId, contractId),
      listGeneratedDocuments(orgId, contractId),
      adminDb
        .collection(`organizations/${orgId}/contracts/${contractId}/shipments`)
        .orderBy("updatedAt", "desc")
        .limit(1)
        .get(),
    ]);

    const [customer, companyConfiguration] = await Promise.all([
      getCustomer(orgId, contract.customerId),
      getCompanyConfiguration(orgId).catch(() => undefined),
    ]);
    const latestShipmentId = shipmentSnap.empty ? undefined : shipmentSnap.docs[0].id;
    const shipment = latestShipmentId
      ? await getShipment(orgId, contractId, latestShipmentId)
      : makePreviewShipment(contractId, orgId);

    const revisions = documents
      .filter((document) => {
        const existingFamily = document.documentFamily ?? resolveDocumentFamily(document.docType);
        const existingVariant = resolveVariantForFamily(existingFamily, document.docVariant);

        return existingFamily === family && existingVariant === variant;
      })
      .map((document) => ({
        id: document.id,
        title: document.outputSnapshot.title,
        status: document.status,
        revisionNumber: document.revisionNumber ?? 1,
        generatedAt: document.generatedAt,
        docVariant: resolveVariantForFamily(family, document.docVariant),
      }));

    const canPreview =
      (family === "commercial_invoice" && variant === "permit")
      || (family === "packing_list" && variant === "permit")
      ? true
      : Boolean(latestShipmentId);

    const currentPreview = canPreview
        ? buildDocumentOutput(familyDefinition.docType, {
          docType: familyDefinition.docType,
          docVariant: variant,
          contract,
          customer,
          shipment,
          companyConfiguration,
        })
      : null;

    const previewRules = currentPreview
      ? validateDocumentGenerationRules({
          docType: familyDefinition.docType,
          docVariant: variant,
          contract,
          customer,
          shipment,
        })
      : null;

    return ok(requestId, {
      family,
      familyLabel: familyDefinition.label,
      docType: familyDefinition.docType,
      variant,
      variantLabel: displayVariant(variant),
      availableVariants: familyDefinition.variants.map((value) => ({
        value,
        label: displayVariant(value),
      })),
      latestShipmentId: latestShipmentId ?? null,
      currentPreview,
      previewWarnings: previewRules?.warnings ?? [],
      unavailableReason: canPreview ? null : "Add a shipment to preview this document.",
      revisions,
      familyRevisionCount: documents.filter((document) => {
        const existingFamily = document.documentFamily ?? resolveDocumentFamily(document.docType);
        return existingFamily === family;
      }).length,
    });
  } catch (error) {
    return fail(requestId, (error as Error).message, 400);
  }
}

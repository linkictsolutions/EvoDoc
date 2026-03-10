import { buildInvoiceOutput } from "@/domain/documents/invoice";
import { buildPackingListOutput } from "@/domain/documents/packing";
import { buildShippingInstructionsOutput } from "@/domain/documents/si";
import { defaultVariantForFamily, resolveDocumentFamily } from "@/domain/documents/catalog";
import { getLogicVersion } from "@/domain/versioning";
import { createHash } from "node:crypto";
import type {
  DocumentInputSnapshot,
  DocumentOutputSnapshot,
  DocumentVariant,
  DocumentType,
  GeneratedDocument,
} from "@/types/models";

export function buildDocumentOutput(
  docType: DocumentType,
  snapshot: DocumentInputSnapshot,
): DocumentOutputSnapshot {
  switch (docType) {
    case "invoice":
      return buildInvoiceOutput(snapshot as DocumentInputSnapshot<"invoice">);
    case "packing_list":
      return buildPackingListOutput(snapshot as DocumentInputSnapshot<"packing_list">);
    case "shipping_instructions":
      return buildShippingInstructionsOutput(snapshot as DocumentInputSnapshot<"shipping_instructions">);
    default:
      throw new Error(`Unsupported docType: ${docType}`);
  }
}

export function makeGeneratedDocumentPayload(args: {
  docType: DocumentType;
  docVariant?: DocumentVariant;
  templateVersion: string;
  inputSnapshot: DocumentInputSnapshot;
  outputSnapshot: DocumentOutputSnapshot;
  shipmentId?: string;
  generatedBy: string;
  revisionNumber: number;
  validationWarnings?: string[];
}): Omit<GeneratedDocument, "id" | "createdAt" | "updatedAt" | "orgId" | "contractId"> {
  const now = new Date().toISOString();
  const documentFamily = resolveDocumentFamily(args.docType);
  const docVariant = args.docVariant ?? defaultVariantForFamily(documentFamily);
  const snapshotHash = createHash("sha256")
    .update(
      JSON.stringify({
        docVariant,
        templateVersion: args.templateVersion,
        logicVersion: getLogicVersion(),
        inputSnapshot: args.inputSnapshot,
        outputSnapshot: args.outputSnapshot,
      }),
    )
    .digest("hex");

  return {
    shipmentId: args.shipmentId,
    docType: args.docType,
    documentFamily,
    docVariant,
    revisionNumber: args.revisionNumber,
    status: "draft",
    templateVersion: args.templateVersion,
    logicVersion: getLogicVersion(),
    snapshotHash,
    inputSnapshot: args.inputSnapshot,
    outputSnapshot: args.outputSnapshot,
    generatedAt: now,
    generatedBy: args.generatedBy,
    validationWarnings: args.validationWarnings ?? [],
  };
}

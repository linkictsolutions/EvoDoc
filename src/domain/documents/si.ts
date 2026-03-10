import { mapDocumentOutput } from "@/domain/documents/map-document-output";
import type { DocumentInputSnapshot, DocumentOutputSnapshot } from "@/types/models";

export function buildShippingInstructionsOutput(
  snapshot: DocumentInputSnapshot<"shipping_instructions">,
): DocumentOutputSnapshot<"shipping_instructions"> {
  return mapDocumentOutput("shipping_instructions", snapshot) as DocumentOutputSnapshot<"shipping_instructions">;
}

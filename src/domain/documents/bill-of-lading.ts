import { mapDocumentOutput } from "@/domain/documents/map-document-output";
import type { DocumentInputSnapshot, DocumentOutputSnapshot } from "@/types/models";

export function buildBillOfLadingOutput(
  snapshot: DocumentInputSnapshot<"bill_of_lading">,
): DocumentOutputSnapshot<"bill_of_lading"> {
  return mapDocumentOutput("bill_of_lading", snapshot) as DocumentOutputSnapshot<"bill_of_lading">;
}

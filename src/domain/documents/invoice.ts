import { mapDocumentOutput } from "@/domain/documents/map-document-output";
import type { DocumentInputSnapshot, DocumentOutputSnapshot } from "@/types/models";

export function buildInvoiceOutput(
  snapshot: DocumentInputSnapshot<"invoice">,
): DocumentOutputSnapshot<"invoice"> {
  return mapDocumentOutput("invoice", snapshot) as DocumentOutputSnapshot<"invoice">;
}

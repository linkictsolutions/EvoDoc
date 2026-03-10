import { mapDocumentOutput } from "@/domain/documents/map-document-output";
import type { DocumentInputSnapshot, DocumentOutputSnapshot } from "@/types/models";

export function buildPackingListOutput(
  snapshot: DocumentInputSnapshot<"packing_list">,
): DocumentOutputSnapshot<"packing_list"> {
  return mapDocumentOutput("packing_list", snapshot) as DocumentOutputSnapshot<"packing_list">;
}

import { mapDocumentOutput } from "@/domain/documents/map-document-output";
import type { DocumentInputSnapshot, DocumentOutputSnapshot } from "@/types/models";

export function buildWayBillOutput(
  snapshot: DocumentInputSnapshot<"way_bill">,
): DocumentOutputSnapshot<"way_bill"> {
  return mapDocumentOutput("way_bill", snapshot) as DocumentOutputSnapshot<"way_bill">;
}

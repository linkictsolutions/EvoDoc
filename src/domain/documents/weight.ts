import { mapDocumentOutput } from "@/domain/documents/map-document-output";
import type { DocumentInputSnapshot, DocumentOutputSnapshot } from "@/types/models";

export function buildWeightCertificateOutput(
  snapshot: DocumentInputSnapshot<"weight_certificate">,
): DocumentOutputSnapshot<"weight_certificate"> {
  return mapDocumentOutput("weight_certificate", snapshot) as DocumentOutputSnapshot<"weight_certificate">;
}

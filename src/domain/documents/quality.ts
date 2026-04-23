import { mapDocumentOutput } from "@/domain/documents/map-document-output";
import type { DocumentInputSnapshot, DocumentOutputSnapshot } from "@/types/models";

export function buildQualityCertificateOutput(
  snapshot: DocumentInputSnapshot<"quality_certificate">,
): DocumentOutputSnapshot<"quality_certificate"> {
  return mapDocumentOutput("quality_certificate", snapshot) as DocumentOutputSnapshot<"quality_certificate">;
}


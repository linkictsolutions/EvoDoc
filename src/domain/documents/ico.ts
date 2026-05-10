import { mapDocumentOutput } from "@/domain/documents/map-document-output";
import type { DocumentInputSnapshot, DocumentOutputSnapshot } from "@/types/models";

export function buildIcoCertificateOutput(
  snapshot: DocumentInputSnapshot<"ico_certificate">,
): DocumentOutputSnapshot<"ico_certificate"> {
  return mapDocumentOutput("ico_certificate", snapshot) as DocumentOutputSnapshot<"ico_certificate">;
}


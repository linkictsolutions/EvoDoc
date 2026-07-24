"use client";

import { TemplateEditorPage } from "@/components/templates/template-editor-page";
import { CERTIFICATE_OF_QUALITY_DEFAULT_SECTIONS } from "@/domain/template-defaults/quality_certificate";

export function CertificateOfQualityTemplatePage() {
  return (
    <TemplateEditorPage
      storageKey="evodoc.templates.quality_certificate.v1"
      docType="quality_certificate"
      title="Certificate of Quality Template"
      subtitle="Template-driven layout for the certificate of quality."
      defaultSections12Col={CERTIFICATE_OF_QUALITY_DEFAULT_SECTIONS}
    />
  );
}

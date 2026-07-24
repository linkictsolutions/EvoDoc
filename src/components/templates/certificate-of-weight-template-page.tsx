"use client";

import { TemplateEditorPage } from "@/components/templates/template-editor-page";
import { CERTIFICATE_OF_WEIGHT_DEFAULT_SECTIONS } from "@/domain/template-defaults/weight_certificate";

export function CertificateOfWeightTemplatePage() {
  return (
    <TemplateEditorPage
      storageKey="evodoc.templates.weight_certificate.v1"
      docType="weight_certificate"
      title="Certificate of Weight Template"
      subtitle="Template-driven layout for the certificate of weight."
      defaultSections12Col={CERTIFICATE_OF_WEIGHT_DEFAULT_SECTIONS}
    />
  );
}

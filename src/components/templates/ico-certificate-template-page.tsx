"use client";

import { TemplateEditorPage } from "@/components/templates/template-editor-page";
import { ICO_CERTIFICATE_DEFAULT_SECTIONS } from "@/domain/template-defaults/ico_certificate";

export function IcoCertificateTemplatePage() {
  return (
    <TemplateEditorPage
      storageKey="evodoc.templates.ico_certificate.v1"
      docType="ico_certificate"
      title="ICO Certificate of Origin Template"
      subtitle="Template editor for mapped ICO certificate fields (initially limited to text blocks)."
      defaultSections12Col={ICO_CERTIFICATE_DEFAULT_SECTIONS}
    />
  );
}

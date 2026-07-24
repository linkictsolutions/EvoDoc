"use client";

import { TemplateEditorPage } from "@/components/templates/template-editor-page";
import { BILL_OF_LADING_DEFAULT_SECTIONS } from "@/domain/template-defaults/bill_of_lading";

export function BillOfLadingTemplatePage() {
  return (
    <TemplateEditorPage
      storageKey="evodoc.templates.bill_of_lading.v1"
      docType="bill_of_lading"
      title="Bill of Lading (MSC) Template"
      subtitle="Template-driven layout for the MSC bill of lading main page. Rider pages use the continuation layout."
      defaultSections12Col={BILL_OF_LADING_DEFAULT_SECTIONS}
    />
  );
}

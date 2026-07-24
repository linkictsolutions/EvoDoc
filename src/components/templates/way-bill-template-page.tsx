"use client";

import { TemplateEditorPage } from "@/components/templates/template-editor-page";
import { WAY_BILL_DEFAULT_SECTIONS } from "@/domain/template-defaults/way_bill";

export function WayBillTemplatePage() {
  return (
    <TemplateEditorPage
      storageKey="evodoc.templates.way_bill.v1"
      docType="way_bill"
      title="Way Bill Template"
      subtitle="Template-driven layout for Way Bills (per driver tab)."
      defaultSections12Col={WAY_BILL_DEFAULT_SECTIONS}
    />
  );
}

"use client";

import { TemplateEditorPage } from "@/components/templates/template-editor-page";
import { WAY_BILL_DEFAULT_SECTIONS } from "@/domain/template-defaults/way_bill";
import { isCurrentWayBillTemplate } from "@/domain/way-bill-template-validation";

export const WAY_BILL_TEMPLATE_STORAGE_KEY = "evodoc.templates.way_bill.v3";

export function WayBillTemplatePage() {
  return (
    <TemplateEditorPage
      storageKey={WAY_BILL_TEMPLATE_STORAGE_KEY}
      docType="way_bill"
      title="Way Bill Template"
      subtitle="PDF-matched layout for Way Bills (per driver tab)."
      defaultSections12Col={WAY_BILL_DEFAULT_SECTIONS}
      acceptStoredTemplate={isCurrentWayBillTemplate}
      resetStoredTemplateMessage="Loaded the latest Way Bill template layout."
    />
  );
}

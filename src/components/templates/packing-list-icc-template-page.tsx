"use client";

import { TemplateEditorPage } from "@/components/templates/template-editor-page";
import { PACKING_LIST_ICC_DEFAULT_SECTIONS } from "@/domain/template-defaults/packing_list";

export function PackingListIccTemplatePage() {
  return (
    <TemplateEditorPage
      storageKey="evodoc.templates.packing_list_icc.v1"
      docType="packing_list"
      title="Packing List (ICC) Template"
      subtitle="This screen maps the existing ICC packing list layout into a structured A4 grid (x/y/w/h blocks)."
      defaultSections12Col={PACKING_LIST_ICC_DEFAULT_SECTIONS}
    />
  );
}

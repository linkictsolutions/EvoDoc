"use client";

import { TemplateEditorPage } from "@/components/templates/template-editor-page";
import { SHIPPING_INSTRUCTIONS_DEFAULT_SECTIONS } from "@/domain/template-defaults/shipping_instructions";

export function ShippingInstructionsTemplatePage() {
  return (
    <TemplateEditorPage
      storageKey="evodoc.templates.shipping_instructions.v1"
      docType="shipping_instructions"
      title="Shipping Instruction Template"
      subtitle="Template-driven layout for Shipping Instructions (A4 grid representation)."
      defaultSections12Col={SHIPPING_INSTRUCTIONS_DEFAULT_SECTIONS}
    />
  );
}

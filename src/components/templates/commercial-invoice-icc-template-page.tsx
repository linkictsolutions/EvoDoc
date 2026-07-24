"use client";

import { TemplateEditorPage } from "@/components/templates/template-editor-page";
import { COMMERCIAL_INVOICE_ICC_DEFAULT_SECTIONS } from "@/domain/template-defaults/invoice";

export function CommercialInvoiceIccTemplatePage() {
  return (
    <TemplateEditorPage
      storageKey="evodoc.templates.commercial_invoice_icc.v1"
      docType="invoice"
      title="Commercial Invoice (ICC) Template"
      subtitle="This screen maps the existing ICC invoice layout into a structured A4 grid (x/y/w/h blocks)."
      defaultSections12Col={COMMERCIAL_INVOICE_ICC_DEFAULT_SECTIONS}
    />
  );
}

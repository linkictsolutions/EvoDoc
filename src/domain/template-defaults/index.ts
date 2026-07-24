import type { DocumentType } from "@/types/models";
import type { TemplateSection } from "@/domain/template-layout";
import { COMMERCIAL_INVOICE_ICC_DEFAULT_SECTIONS } from "@/domain/template-defaults/invoice";
import { PACKING_LIST_ICC_DEFAULT_SECTIONS } from "@/domain/template-defaults/packing_list";
import { SHIPPING_INSTRUCTIONS_DEFAULT_SECTIONS } from "@/domain/template-defaults/shipping_instructions";
import { CERTIFICATE_OF_QUALITY_DEFAULT_SECTIONS } from "@/domain/template-defaults/quality_certificate";
import { CERTIFICATE_OF_WEIGHT_DEFAULT_SECTIONS } from "@/domain/template-defaults/weight_certificate";
import { WAY_BILL_DEFAULT_SECTIONS } from "@/domain/template-defaults/way_bill";
import { ICO_CERTIFICATE_DEFAULT_SECTIONS } from "@/domain/template-defaults/ico_certificate";
import { BILL_OF_LADING_DEFAULT_SECTIONS } from "@/domain/template-defaults/bill_of_lading";

const DEFAULT_SECTIONS_BY_DOC_TYPE: Partial<Record<DocumentType, TemplateSection[]>> = {
  invoice: COMMERCIAL_INVOICE_ICC_DEFAULT_SECTIONS,
  packing_list: PACKING_LIST_ICC_DEFAULT_SECTIONS,
  shipping_instructions: SHIPPING_INSTRUCTIONS_DEFAULT_SECTIONS,
  quality_certificate: CERTIFICATE_OF_QUALITY_DEFAULT_SECTIONS,
  weight_certificate: CERTIFICATE_OF_WEIGHT_DEFAULT_SECTIONS,
  way_bill: WAY_BILL_DEFAULT_SECTIONS,
  ico_certificate: ICO_CERTIFICATE_DEFAULT_SECTIONS,
  bill_of_lading: BILL_OF_LADING_DEFAULT_SECTIONS,
};

export function getFactoryDefaultSections(docType: DocumentType, docVariant?: string): TemplateSection[] | null {
  if (docType === "packing_list" && docVariant === "permit") {
    return null;
  }
  return DEFAULT_SECTIONS_BY_DOC_TYPE[docType] ?? null;
}

export function getFactoryDefaultSectionsForDocType(docType: DocumentType): TemplateSection[] | null {
  return DEFAULT_SECTIONS_BY_DOC_TYPE[docType] ?? null;
}

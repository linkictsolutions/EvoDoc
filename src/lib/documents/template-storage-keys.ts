export const ICC_INVOICE_TEMPLATE_STORAGE_KEY = "evodoc.templates.commercial_invoice_icc.v1";
export const ICC_PACKING_TEMPLATE_STORAGE_KEY = "evodoc.templates.packing_list_icc.v1";
export const SHIPPING_INSTRUCTIONS_TEMPLATE_STORAGE_KEY = "evodoc.templates.shipping_instructions.v1";
export const QUALITY_CERT_TEMPLATE_STORAGE_KEY = "evodoc.templates.quality_certificate.v1";
export const WEIGHT_CERT_TEMPLATE_STORAGE_KEY = "evodoc.templates.weight_certificate.v1";
export const WAY_BILL_TEMPLATE_STORAGE_KEY = "evodoc.templates.way_bill.v4";
export const ICO_CERT_TEMPLATE_STORAGE_KEY = "evodoc.templates.ico_certificate.v1";
export const BILL_OF_LADING_TEMPLATE_STORAGE_KEY = "evodoc.templates.bill_of_lading.v1";

export function readTemplateLayoutForDocType(docType: string, docVariant?: string): string | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  if (docType === "invoice") {
    return window.localStorage.getItem(ICC_INVOICE_TEMPLATE_STORAGE_KEY) ?? undefined;
  }
  if (docType === "packing_list" && docVariant !== "permit") {
    return window.localStorage.getItem(ICC_PACKING_TEMPLATE_STORAGE_KEY) ?? undefined;
  }
  if (docType === "shipping_instructions") {
    return window.localStorage.getItem(SHIPPING_INSTRUCTIONS_TEMPLATE_STORAGE_KEY) ?? undefined;
  }
  if (docType === "quality_certificate") {
    return window.localStorage.getItem(QUALITY_CERT_TEMPLATE_STORAGE_KEY) ?? undefined;
  }
  if (docType === "weight_certificate") {
    return window.localStorage.getItem(WEIGHT_CERT_TEMPLATE_STORAGE_KEY) ?? undefined;
  }
  if (docType === "way_bill") {
    return window.localStorage.getItem(WAY_BILL_TEMPLATE_STORAGE_KEY) ?? undefined;
  }
  if (docType === "ico_certificate") {
    return window.localStorage.getItem(ICO_CERT_TEMPLATE_STORAGE_KEY) ?? undefined;
  }
  if (docType === "bill_of_lading") {
    return window.localStorage.getItem(BILL_OF_LADING_TEMPLATE_STORAGE_KEY) ?? undefined;
  }

  return undefined;
}

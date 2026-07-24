"use client";

import { TemplateEditorPage, type TemplateSection } from "@/components/templates/template-editor-page";

const DEFAULT_SECTIONS: TemplateSection[] = [
  {
    id: "header_meta",
    label: "Header + Meta",
    description: "COMMERCIAL INVOICE header, date/ref rows, exporter/applicant/consignee + shipment metadata.",
    x: 0,
    y: 0,
    w: 12,
    h: 20,
    minH: 20,
    cells: [
      { id: "inv_title", label: "COMMERCIAL INVOICE", x: 0, y: 0, w: 6, h: 2 },
      { id: "inv_page", label: "PAGE 1 OF 1 | ORIGINAL/FINAL", x: 6, y: 0, w: 6, h: 2 },
      { id: "inv_date", label: "Date", x: 0, y: 2, w: 6, h: 2 },
      { id: "inv_sales_ref", label: "Sales Contract Ref", x: 6, y: 2, w: 4, h: 2 },
      { id: "inv_ref1", label: "Ref No", x: 10, y: 2, w: 2, h: 2 },
      { id: "inv_ref2", label: "Ref No", x: 0, y: 4, w: 6, h: 2 },
      { id: "inv_sales_date", label: "Sales Contract Date", x: 6, y: 4, w: 6, h: 2 },
      { id: "inv_exporter", label: "Exporter/Beneficiary/Seller", x: 0, y: 6, w: 6, h: 2 },
      { id: "inv_bank_permit", label: "Bank Permit Number", x: 6, y: 6, w: 6, h: 2 },
      { id: "inv_applicant", label: "Applicant/Notify", x: 0, y: 8, w: 6, h: 2 },
      { id: "inv_bol", label: "Bill of Lading Number", x: 6, y: 8, w: 6, h: 2 },
      { id: "inv_consignee", label: "Consignee", x: 0, y: 10, w: 6, h: 2 },
      { id: "inv_dispatch", label: "Method of Dispatch", x: 6, y: 10, w: 6, h: 2 },
      { id: "inv_eccsa", label: "ECCSA - Certificate of Origin Number", x: 0, y: 12, w: 6, h: 2 },
      { id: "inv_vessel", label: "Vessel & Voyage Number", x: 6, y: 12, w: 6, h: 2 },
      { id: "inv_spacer", label: "(spacer)", x: 0, y: 14, w: 6, h: 2 },
      { id: "inv_ship_date", label: "Shipped on Board Date", x: 6, y: 14, w: 6, h: 2 },
    ],
  },
  {
    id: "goods_table",
    label: "Goods Table",
    description: "S/N, description, HS code, quantity columns, unit price, totals, amount in words.",
    x: 0,
    y: 21,
    w: 12,
    h: 13,
    minH: 13,
    cells: [
      { id: "gt_sn", label: "S / N", x: 0, y: 0, w: 1, h: 3 },
      { id: "gt_desc", label: "DESCRIPTION OF GOODS", x: 1, y: 0, w: 3, h: 3 },
      { id: "gt_hs", label: "HS CODE", x: 4, y: 0, w: 1, h: 3 },
      { id: "gt_lb", label: "QTY LB (NET)", x: 5, y: 0, w: 1, h: 3 },
      { id: "gt_kg_net", label: "QTY KG (NET)", x: 6, y: 0, w: 1, h: 3 },
      { id: "gt_kg_gross", label: "QTY KG (GROSS)", x: 7, y: 0, w: 1, h: 3 },
      { id: "gt_bags", label: "PACKAGES (BAGS)", x: 8, y: 0, w: 1, h: 3 },
      { id: "gt_unit_price", label: "UNIT PRICE USC/LB", x: 9, y: 0, w: 2, h: 3 },
      { id: "gt_total", label: "TOTAL PRICE USD", x: 11, y: 0, w: 1, h: 3 },
      { id: "gt_row", label: "Row 1 values…", x: 0, y: 3, w: 12, h: 3 },
      { id: "gt_total_label", label: "TOTAL AMOUNT IN USD", x: 0, y: 6, w: 10, h: 2 },
      { id: "gt_total_value", label: "Total Amount USD", x: 10, y: 6, w: 2, h: 2 },
      { id: "gt_words", label: "AMOUNT IN WORDS", x: 0, y: 8, w: 12, h: 3 },
    ],
  },
  {
    id: "bank_details",
    label: "Bank Details",
    description: "Beneficiary bank + correspondent bank details.",
    x: 0,
    y: 35,
    w: 12,
    h: 12,
    minH: 12,
    cells: [
      { id: "bd_beneficiary_hdr", label: "Bank Details (Beneficiary)", x: 0, y: 0, w: 6, h: 2 },
      { id: "bd_corr_hdr", label: "Correspondent Bank", x: 6, y: 0, w: 6, h: 2 },
      { id: "bd_bank_beneficiary", label: "Bank of Beneficiary", x: 0, y: 2, w: 4, h: 2 },
      { id: "bd_bank_address", label: "Address of Bank", x: 4, y: 2, w: 2, h: 2 },
      { id: "bd_corr_bank_name", label: "Bank Name", x: 6, y: 2, w: 3, h: 2 },
      { id: "bd_corr_bank_address", label: "Address", x: 9, y: 2, w: 3, h: 2 },
      { id: "bd_beneficiary_name", label: "Name of Beneficiary", x: 0, y: 4, w: 4, h: 2 },
      { id: "bd_beneficiary_swift", label: "SWIFT Number", x: 4, y: 4, w: 2, h: 2 },
      { id: "bd_corr_swift", label: "SWIFT Number", x: 6, y: 4, w: 3, h: 2 },
      { id: "bd_corr_acc", label: "Acc. No", x: 9, y: 4, w: 3, h: 2 },
      { id: "bd_beneficiary_acc", label: "Beneficiaries Acc. No", x: 0, y: 6, w: 6, h: 2 },
      { id: "bd_spacer", label: "(spacer)", x: 6, y: 6, w: 6, h: 2 },
    ],
  },
  {
    id: "terms_and_signature",
    label: "Terms + Declaration",
    description: "Origin/ports/destination + declaration + signature & full marking.",
    x: 0,
    y: 48,
    w: 12,
    h: 26,
    minH: 26,
    cells: [
      { id: "ts_origin", label: "Country of Origin", x: 0, y: 0, w: 6, h: 2 },
      { id: "ts_place_issue", label: "Place of Issue", x: 6, y: 0, w: 6, h: 2 },
      { id: "ts_port_loading", label: "Port of Loading", x: 0, y: 2, w: 6, h: 2 },
      { id: "ts_date_issue", label: "Date of Issue", x: 6, y: 2, w: 6, h: 2 },
      { id: "ts_port_discharge", label: "Port of Discharge", x: 0, y: 4, w: 6, h: 2 },
      { id: "ts_signatory_company", label: "Signatory Company", x: 6, y: 4, w: 6, h: 2 },
      { id: "ts_final_destination", label: "Final Destination", x: 0, y: 6, w: 6, h: 2 },
      { id: "ts_auth_name", label: "Name of Authorized Signatory", x: 6, y: 6, w: 6, h: 2 },
      { id: "ts_delivery_term", label: "Delivery/Trade Term", x: 0, y: 8, w: 6, h: 2 },
      { id: "ts_declaration", label: "Declaration (text block)", x: 6, y: 8, w: 6, h: 4 },
      { id: "ts_type_shipment", label: "Type of Shipment", x: 0, y: 10, w: 6, h: 2 },
      { id: "ts_incoterm", label: "Incoterm", x: 0, y: 12, w: 6, h: 2 },
      { id: "ts_signature", label: "Authorized Signature & Seal/Stamp", x: 6, y: 12, w: 6, h: 2 },
      { id: "ts_payment", label: "Term/Method of Payment", x: 0, y: 14, w: 6, h: 2 },
      { id: "ts_packaging_label", label: "Packaging & Marking (Label)", x: 0, y: 16, w: 6, h: 2 },
      { id: "ts_full_marking", label: "FULL MARKING", x: 0, y: 18, w: 6, h: 4 },
      { id: "ts_full_sign_box", label: "(signature box)", x: 6, y: 18, w: 6, h: 4 },
    ],
  },
  {
    id: "document_id",
    label: "Document ID",
    description: "Footer document ID line.",
    x: 0,
    y: 75,
    w: 12,
    h: 4,
    minH: 4,
    cells: [],
  },
];

export function CommercialInvoiceIccTemplatePage() {
  return (
    <TemplateEditorPage
      storageKey="evodoc.templates.commercial_invoice_icc.v1"
      docType="invoice"
      title="Commercial Invoice (ICC) Template"
      subtitle="This screen maps the existing ICC invoice layout into a structured A4 grid (x/y/w/h blocks)."
      defaultSections12Col={DEFAULT_SECTIONS}
    />
  );
}


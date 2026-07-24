"use client";

import { TemplateEditorPage, type TemplateSection } from "@/components/templates/template-editor-page";

const DEFAULT_SECTIONS: TemplateSection[] = [
  {
    id: "header_meta",
    label: "Header + Meta",
    description: "Packing list header + contract refs, parties, and vessel metadata.",
    x: 0,
    y: 0,
    w: 12,
    h: 24,
    minH: 24,
    cells: [
      { id: "pl_title", label: "PACKING LIST", x: 0, y: 0, w: 6, h: 2 },
      { id: "pl_page", label: "PAGE 1 OF 1 | ORIGINAL/FINAL", x: 6, y: 0, w: 6, h: 2 },
      { id: "pl_date", label: "Date", x: 0, y: 2, w: 6, h: 2 },
      { id: "pl_sales_ref", label: "Sales Contract Ref", x: 6, y: 2, w: 6, h: 2 },
      { id: "pl_ref_no", label: "Ref No", x: 0, y: 4, w: 6, h: 2 },
      { id: "pl_sales_date", label: "Sales Contract Date", x: 6, y: 4, w: 6, h: 2 },
      { id: "pl_exporter", label: "Exporter/Beneficiary/Seller", x: 0, y: 6, w: 6, h: 4 },
      { id: "pl_bank_permit", label: "Bank Permit Number", x: 6, y: 6, w: 6, h: 4 },
      { id: "pl_applicant", label: "Applicant/Notify", x: 0, y: 10, w: 6, h: 4 },
      { id: "pl_bol", label: "Bill of Lading Number", x: 6, y: 10, w: 6, h: 4 },
      { id: "pl_consignee", label: "Consignee", x: 0, y: 14, w: 6, h: 4 },
      { id: "pl_ship_date", label: "Shipped on Board Date", x: 6, y: 14, w: 6, h: 4 },
      { id: "pl_shipping_line", label: "Shipping Line", x: 0, y: 18, w: 4, h: 2 },
      { id: "pl_vessel", label: "Vessel", x: 4, y: 18, w: 2, h: 2 },
      { id: "pl_voyage", label: "Voyage No", x: 6, y: 18, w: 4, h: 2 },
      { id: "pl_eccsa", label: "ECCSA - Certificate of Origin Number", x: 10, y: 18, w: 2, h: 2 },
    ],
  },
  {
    id: "goods_details",
    label: "Goods Details",
    description: "Description of goods + HS code.",
    x: 0,
    y: 0,
    w: 12,
    h: 10,
    minH: 10,
    cells: [
      { id: "gd_desc", label: "DESCRIPTION OF GOODS", x: 0, y: 0, w: 12, h: 2 },
      { id: "gd_hs", label: "HS CODE", x: 0, y: 2, w: 12, h: 2 },
    ],
  },
  {
    id: "container_table",
    label: "Container Table",
    description: "Container number, seal, packages, net/gross weights.",
    x: 0,
    y: 0,
    w: 12,
    h: 16,
    minH: 16,
    cells: [
      { id: "ct_container", label: "CONTAINER NUMBER", x: 0, y: 0, w: 3, h: 3 },
      { id: "ct_seal", label: "SEAL NUMBER", x: 3, y: 0, w: 3, h: 3 },
      { id: "ct_packages", label: "NO. OF PACKAGES", x: 6, y: 0, w: 2, h: 3 },
      { id: "ct_net_kgs", label: "NET WEIGHT IN KGS", x: 8, y: 0, w: 2, h: 3 },
      { id: "ct_gross_kgs", label: "GROSS WEIGHT IN KGS", x: 10, y: 0, w: 2, h: 3 },
      { id: "ct_row", label: "Row values…", x: 0, y: 3, w: 12, h: 3 },
    ],
  },
  {
    id: "terms_totals",
    label: "Terms + Totals",
    description: "Origin/ports/destination + declaration + totals.",
    x: 0,
    y: 0,
    w: 12,
    h: 22,
    minH: 22,
    cells: [
      { id: "tt_origin", label: "Country of Origin", x: 0, y: 0, w: 6, h: 2 },
      { id: "tt_place_issue", label: "Place of Issue", x: 6, y: 0, w: 6, h: 2 },
      { id: "tt_port_loading", label: "Port of Loading", x: 0, y: 2, w: 6, h: 2 },
      { id: "tt_date_issue", label: "Date of Issue", x: 6, y: 2, w: 6, h: 2 },
      { id: "tt_port_discharge", label: "Port of Discharge", x: 0, y: 4, w: 6, h: 2 },
      { id: "tt_signatory_company", label: "Signatory Company", x: 6, y: 4, w: 6, h: 2 },
      { id: "tt_final_destination", label: "Final Destination", x: 0, y: 6, w: 6, h: 2 },
      { id: "tt_auth_sign_name", label: "Authorized Signatory Name", x: 6, y: 6, w: 6, h: 2 },
      { id: "tt_delivery_term", label: "Delivery/Trade Term", x: 0, y: 8, w: 6, h: 2 },
      { id: "tt_declaration", label: "Declaration", x: 6, y: 8, w: 6, h: 6 },
      { id: "tt_type_shipment", label: "Type of Shipment", x: 0, y: 10, w: 6, h: 2 },
      { id: "tt_incoterm", label: "Incoterm", x: 0, y: 12, w: 6, h: 2 },
      { id: "tt_payment", label: "Term/Method of Payment", x: 0, y: 14, w: 6, h: 2 },
      { id: "tt_total_net", label: "Total Net Weight (MT)", x: 6, y: 14, w: 6, h: 2 },
      { id: "tt_packaging_label", label: "Packaging & Marking (Label)", x: 0, y: 16, w: 6, h: 2 },
      { id: "tt_total_gross", label: "Total Gross Weight (MT)", x: 6, y: 16, w: 6, h: 2 },
      { id: "tt_packing_date", label: "Packing Date", x: 0, y: 18, w: 6, h: 2 },
      { id: "tt_packing_place", label: "Packing Place", x: 6, y: 18, w: 6, h: 2 },
      { id: "tt_address", label: "Address", x: 0, y: 20, w: 12, h: 2 },
    ],
  },
  {
    id: "footer_marking",
    label: "Full Marking + Signature",
    description: "Full marking block + signature box.",
    x: 0,
    y: 0,
    w: 12,
    h: 10,
    minH: 10,
    cells: [
      { id: "fm_full_marking", label: "FULL MARKING", x: 0, y: 0, w: 6, h: 4 },
      { id: "fm_signature", label: "Authorized Signature & Company Seal/Stamp", x: 6, y: 0, w: 6, h: 4 },
    ],
  },
  {
    id: "document_id",
    label: "Document ID",
    description: "Footer document ID line.",
    x: 0,
    y: 0,
    w: 12,
    h: 4,
    minH: 4,
    cells: [],
  },
];

export function PackingListIccTemplatePage() {
  return (
    <TemplateEditorPage
      storageKey="evodoc.templates.packing_list_icc.v1"
      docType="packing_list"
      title="Packing List (ICC) Template"
      subtitle="This screen maps the existing ICC packing list layout into a structured A4 grid (x/y/w/h blocks)."
      defaultSections12Col={DEFAULT_SECTIONS}
    />
  );
}


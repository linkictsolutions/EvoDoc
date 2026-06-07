"use client";

import { TemplateEditorPage, type TemplateSection } from "@/components/templates/template-editor-page";

const DEFAULT_SECTIONS: TemplateSection[] = [
  {
    id: "meta",
    label: "Header + Bill Meta",
    description: "Carrier header, bill meta, bill number, rider count, and reference.",
    x: 0,
    y: 0,
    w: 12,
    h: 10,
    minH: 10,
    cells: [
      { id: "bl_title", label: "MEDITERRANEAN SHIPPING COMPANY S.A. / SCAC Code: MSCU", x: 0, y: 0, w: 7, h: 2 },
      { id: "bl_page", label: "PAGE 1 OF 1 | ORIGINAL", x: 7, y: 0, w: 5, h: 2 },
      { id: "bl_bill_type", label: "Bill Type", x: 0, y: 2, w: 3, h: 2 },
      { id: "bl_copy_bills", label: "NO. COPY BILLS", x: 3, y: 2, w: 2, h: 2 },
      { id: "bl_rider_pages", label: "NO. OF RIDER PAGES", x: 5, y: 2, w: 2, h: 2 },
      { id: "bl_bill_no", label: "BILL OF LADING No.", x: 7, y: 2, w: 5, h: 2 },
      { id: "bl_reference_type", label: "Reference Type", x: 0, y: 4, w: 3, h: 2 },
      { id: "bl_reference_value", label: "Reference Value", x: 3, y: 4, w: 9, h: 2 },
    ],
  },
  {
    id: "parties",
    label: "Parties",
    description: "Shipper, consignee, notify, endorsements, notify-II, notify 3.",
    x: 0,
    y: 11,
    w: 12,
    h: 14,
    minH: 14,
    cells: [
      { id: "bl_shipper", label: "Shipper", x: 0, y: 0, w: 6, h: 4 },
      { id: "bl_carrier_endorsements", label: "Carrier Agents Endorsements", x: 6, y: 0, w: 6, h: 4 },
      { id: "bl_consignee", label: "Consignee", x: 0, y: 4, w: 6, h: 4 },
      { id: "bl_notify2", label: "Notify 2", x: 6, y: 4, w: 6, h: 4 },
      { id: "bl_notify", label: "Notify Parties", x: 0, y: 8, w: 6, h: 4 },
      { id: "bl_notify3", label: "Notify 3", x: 6, y: 8, w: 6, h: 4 },
    ],
  },
  {
    id: "routing",
    label: "Routing",
    description: "Vessel, loading/discharge, receipt, and delivery.",
    x: 0,
    y: 26,
    w: 12,
    h: 8,
    minH: 8,
    cells: [
      { id: "bl_vessel_voyage", label: "Vessel & Voyage No", x: 0, y: 0, w: 4, h: 2 },
      { id: "bl_port_loading", label: "Port of Loading", x: 4, y: 0, w: 4, h: 2 },
      { id: "bl_place_receipt", label: "Place of Receipt", x: 8, y: 0, w: 4, h: 2 },
      { id: "bl_port_discharge", label: "Port of Discharge", x: 4, y: 2, w: 4, h: 2 },
      { id: "bl_place_delivery", label: "Place of Delivery", x: 8, y: 2, w: 4, h: 2 },
    ],
  },
  {
    id: "cargo_table",
    label: "Cargo Table",
    description: "Marks, goods description, gross weight, and measurement.",
    x: 0,
    y: 35,
    w: 12,
    h: 10,
    minH: 10,
    cells: [
      { id: "bl_particulars_hdr", label: "PARTICULARS FURNISHED BY THE SHIPPER", x: 0, y: 0, w: 12, h: 2 },
      { id: "bl_marks", label: "Container Numbers, Seal Numbers and Marks", x: 0, y: 2, w: 2, h: 2 },
      { id: "bl_description", label: "Description of Packages and Goods", x: 2, y: 2, w: 7, h: 2 },
      { id: "bl_gross_weight", label: "Gross Cargo Weight", x: 9, y: 2, w: 2, h: 2 },
      { id: "bl_measurement", label: "Measurement", x: 11, y: 2, w: 1, h: 2 },
      { id: "bl_cargo_row", label: "Cargo Row", x: 0, y: 4, w: 12, h: 4 },
    ],
  },
  {
    id: "footer",
    label: "Freight + Footer",
    description: "Freight, legal text, declared value, carrier receipt, issue and onboard date.",
    x: 0,
    y: 46,
    w: 12,
    h: 12,
    minH: 12,
    cells: [
      { id: "bl_freight", label: "Freight & Charges", x: 0, y: 0, w: 4, h: 3 },
      { id: "bl_legal", label: "Legal Text", x: 4, y: 0, w: 8, h: 3 },
      { id: "bl_declared", label: "Declared Value", x: 0, y: 3, w: 4, h: 2 },
      { id: "bl_carrier_receipt", label: "Carrier Receipt", x: 4, y: 3, w: 4, h: 2 },
      { id: "bl_signed", label: "Signed on Behalf", x: 8, y: 3, w: 4, h: 2 },
      { id: "bl_issue", label: "Place and Date of Issue", x: 0, y: 5, w: 6, h: 2 },
      { id: "bl_shipped_on_board", label: "Shipped on Board Date", x: 6, y: 5, w: 6, h: 2 },
    ],
  },
  {
    id: "document_id",
    label: "Document ID",
    description: "Footer document ID line.",
    x: 0,
    y: 59,
    w: 12,
    h: 4,
    minH: 4,
    cells: [],
  },
];

export function BillOfLadingTemplatePage() {
  return (
    <TemplateEditorPage
      storageKey="evodoc.templates.bill_of_lading.v1"
      title="Bill of Lading (MSC) Template"
      subtitle="Template-driven layout for the MSC bill of lading main page. Rider pages use the continuation layout."
      defaultSections12Col={DEFAULT_SECTIONS}
    />
  );
}

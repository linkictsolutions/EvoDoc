import type { TemplateSection } from "@/domain/template-layout";

export const WAY_BILL_TEMPLATE_LAYOUT_VERSION = 3;

function labelCell(id: string, label: string, y: number) {
  return {
    id,
    label,
    x: 0,
    y,
    w: 4,
    h: 2,
    contentKind: "static" as const,
    staticHtml: `<p><strong>${label}</strong></p>`,
  };
}

function valueCell(id: string, label: string, y: number) {
  return {
    id,
    label,
    x: 4,
    y,
    w: 8,
    h: 2,
  };
}

function labelValueRow(labelId: string, label: string, valueId: string, valueLabel: string, y: number) {
  return [
    labelCell(labelId, label, y),
    valueCell(valueId, valueLabel, y),
  ];
}

export const WAY_BILL_DEFAULT_SECTIONS: TemplateSection[] = [
  {
    id: "header_meta",
    label: "Header + Meta",
    description: "Way bill title with date and reference on the right.",
    x: 0,
    y: 0,
    w: 12,
    h: 6,
    minH: 6,
    cells: [
      { id: "wb_title", label: "WAY BILL", x: 0, y: 0, w: 6, h: 2 },
      { id: "wb_date", label: "Date", x: 6, y: 0, w: 6, h: 1 },
      { id: "wb_ref", label: "Ref No", x: 6, y: 1, w: 6, h: 1 },
    ],
  },
  {
    id: "transport",
    label: "Transport Details",
    description: "Two-column table: label on the left, value on the right.",
    x: 0,
    y: 0,
    w: 12,
    h: 16,
    minH: 16,
    cells: [
      ...labelValueRow("wb_lbl_to", "To:", "wb_to", "To", 0),
      { id: "wb_lbl_to_contact_spacer", label: "(spacer no border)", x: 0, y: 2, w: 4, h: 2, showBorder: false },
      valueCell("wb_to_contact", "To Contact", 2),
      ...labelValueRow("wb_lbl_truck", "Truck No:", "wb_truck", "Truck No", 4),
      ...labelValueRow("wb_lbl_trailer", "Trailer No:", "wb_trailer", "Trailer No", 6),
      ...labelValueRow("wb_lbl_driver", "Driver Name:", "wb_driver", "Driver Name", 8),
      ...labelValueRow("wb_lbl_driver_phone", "Driver Phone No:", "wb_driver_phone", "Driver Phone No", 10),
      ...labelValueRow("wb_lbl_license", "License No:", "wb_license", "License No", 12),
      ...labelValueRow("wb_lbl_destination", "Final Destination:", "wb_destination", "Final Destination", 14),
    ],
  },
  {
    id: "declaration",
    label: "Driver Declaration",
    description: "Driver declaration heading and text.",
    x: 0,
    y: 0,
    w: 12,
    h: 8,
    minH: 8,
    cells: [
      { id: "wb_decl_title", label: "Driver's Declaration", x: 0, y: 0, w: 12, h: 2 },
      { id: "wb_driver_decl", label: "Driver Declaration", x: 0, y: 2, w: 12, h: 6 },
    ],
  },
  {
    id: "conditions",
    label: "Terms and Conditions",
    description: "Way bill terms and conditions block.",
    x: 0,
    y: 0,
    w: 12,
    h: 8,
    minH: 8,
    cells: [
      { id: "wb_terms_intro", label: "Terms Intro", x: 0, y: 0, w: 12, h: 2 },
      { id: "wb_condition_1", label: "Condition 1", x: 0, y: 2, w: 12, h: 2 },
      { id: "wb_condition_2", label: "Condition 2", x: 0, y: 4, w: 12, h: 2 },
      { id: "wb_condition_3", label: "Condition 3", x: 0, y: 6, w: 12, h: 2 },
    ],
  },
  {
    id: "goods",
    label: "Goods",
    description: "Detail of goods table with label/value rows.",
    x: 0,
    y: 0,
    w: 12,
    h: 16,
    minH: 16,
    cells: [
      { id: "wb_goods_hdr", label: "Detail of Goods", x: 0, y: 0, w: 12, h: 2 },
      ...labelValueRow("wb_lbl_goods_desc", "Description", "wb_goods_desc", "Detail of Goods", 2),
      ...labelValueRow("wb_lbl_ico", "ICO No", "wb_ico", "ICO No", 4),
      ...labelValueRow("wb_lbl_cert", "Cert No", "wb_cert", "Cert No", 6),
      ...labelValueRow("wb_lbl_bags", "No of Bag", "wb_bags", "No of Bag", 8),
      ...labelValueRow("wb_lbl_gross", "Gross Weight", "wb_gross", "Gross Weight", 10),
      ...labelValueRow("wb_lbl_net", "Net Weight", "wb_net", "Net Weight", 12),
    ],
  },
  {
    id: "transport_charge",
    label: "Transport Charge",
    description: "Three-column transport charge row.",
    x: 0,
    y: 0,
    w: 12,
    h: 4,
    minH: 4,
    cells: [
      { id: "wb_transport_label", label: "Transport Charge Label", x: 0, y: 0, w: 6, h: 2 },
      { id: "wb_transport_per_quantal", label: "Transport Charge Per Quantal", x: 6, y: 0, w: 3, h: 2 },
      { id: "wb_transport_total", label: "Transport Charge Total", x: 9, y: 0, w: 3, h: 2 },
    ],
  },
  {
    id: "containers",
    label: "Containers",
    description: "Container and seal numbers in two columns.",
    x: 0,
    y: 0,
    w: 12,
    h: 6,
    minH: 6,
    cells: [
      { id: "wb_container_hdr_container", label: "Container No", x: 0, y: 0, w: 6, h: 2 },
      { id: "wb_container_hdr_seal", label: "Seal No", x: 6, y: 0, w: 6, h: 2 },
      { id: "wb_container_1", label: "Container No 1", x: 0, y: 2, w: 6, h: 2 },
      { id: "wb_seal_1", label: "Seal No 1", x: 6, y: 2, w: 6, h: 2 },
      { id: "wb_container_2", label: "Container No 2", x: 0, y: 4, w: 6, h: 2 },
      { id: "wb_seal_2", label: "Seal No 2", x: 6, y: 4, w: 6, h: 2 },
    ],
  },
  {
    id: "amharic",
    label: "Amharic Declaration",
    description: "Amharic declaration text block.",
    x: 0,
    y: 0,
    w: 12,
    h: 4,
    minH: 4,
    cells: [
      { id: "wb_amharic", label: "Amharic Declaration", x: 0, y: 0, w: 12, h: 4 },
    ],
  },
  {
    id: "footer",
    label: "Footer Signatures",
    description: "Driver name, signature, and date lines.",
    x: 0,
    y: 0,
    w: 12,
    h: 6,
    minH: 6,
    cells: [
      { id: "wb_footer_driver_name", label: "Driver Name Row", x: 0, y: 0, w: 12, h: 2 },
      { id: "wb_footer_signature", label: "Signature Row", x: 0, y: 2, w: 12, h: 2 },
      { id: "wb_footer_date", label: "Date Row", x: 0, y: 4, w: 12, h: 2 },
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
    showDocumentId: false,
    cells: [],
  },
];

import {
  isTemplateRichContentCell,
  resolveTemplateCellStaticHtml,
} from "@/domain/template-static-content";
import type { TemplateGridCell } from "@/domain/template-layout";

type WayBillRow = {
  label: string;
  value: string;
};

export const WAY_BILL_CELL_LABEL_MAP: Record<string, string> = {
  wb_date: "Date",
  wb_ref: "Ref No",
  wb_to: "To",
  wb_to_contact: "To Contact",
  wb_truck: "Truck No",
  wb_trailer: "Trailer No",
  wb_driver: "Driver Name",
  wb_driver_phone: "Driver Phone No",
  wb_license: "License No",
  wb_destination: "Final Destination",
  wb_driver_decl: "Driver Declaration",
  wb_terms_intro: "Terms Intro",
  wb_condition_1: "Condition 1",
  wb_condition_2: "Condition 2",
  wb_condition_3: "Condition 3",
  wb_goods_desc: "Detail of Goods",
  wb_ico: "ICO No",
  wb_cert: "Cert No",
  wb_bags: "No of Bag",
  wb_gross: "Gross Weight",
  wb_net: "Net Weight",
  wb_transport_label: "Transport Charge Label",
  wb_transport_per_quantal: "Transport Charge Per Quantal",
  wb_transport_total: "Transport Charge Total",
  wb_container_1: "Container No 1",
  wb_seal_1: "Seal No 1",
  wb_container_2: "Container No 2",
  wb_seal_2: "Seal No 2",
  wb_amharic: "Amharic Declaration",
};

export const WAY_BILL_FOOTER_ROW_MAP: Record<string, { labelField: string; valueField: string }> = {
  wb_footer_driver_name: {
    labelField: "Driver Name Label",
    valueField: "Driver Name",
  },
  wb_footer_signature: {
    labelField: "Driver Signature Label",
    valueField: "Dispatch Signature Label",
  },
  wb_footer_date: {
    labelField: "Driver Date Label",
    valueField: "Stamp Date Label",
  },
};

export const WAY_BILL_TRANSPORT_ROW_ORDER = [
  "wb_to",
  "wb_to_contact",
  "wb_truck",
  "wb_trailer",
  "wb_driver",
  "wb_driver_phone",
  "wb_license",
  "wb_destination",
] as const;

export const WAY_BILL_GOODS_ROW_ORDER = [
  { cellId: "wb_goods_desc", rowLabel: "Description" },
  { cellId: "wb_ico", rowLabel: "ICO No" },
  { cellId: "wb_cert", rowLabel: "Cert No" },
  { cellId: "wb_bags", rowLabel: "No of Bag" },
  { cellId: "wb_gross", rowLabel: "Gross Weight" },
  { cellId: "wb_net", rowLabel: "Net Weight" },
] as const;

function rowValue(rows: WayBillRow[], label: string): string {
  return rows.find((row) => row.label === label)?.value?.trim() ?? "";
}

export function resolveWayBillCellValue(rows: WayBillRow[], cell: TemplateGridCell): string {
  if (cell.id === "wb_title") {
    return cell.label;
  }

  const mapped = WAY_BILL_CELL_LABEL_MAP[cell.id] ?? cell.label;
  return rowValue(rows, mapped);
}

export function resolveWayBillFooterRow(
  rows: WayBillRow[],
  cellId: string,
): { label: string; value: string } | null {
  const mapping = WAY_BILL_FOOTER_ROW_MAP[cellId];
  if (!mapping) {
    return null;
  }

  return {
    label: rowValue(rows, mapping.labelField),
    value: rowValue(rows, mapping.valueField),
  };
}

export function isWayBillStaticCell(cell: TemplateGridCell): boolean {
  return isTemplateRichContentCell(cell);
}

export function resolveWayBillStaticHtml(cell: TemplateGridCell): string {
  return resolveTemplateCellStaticHtml(cell);
}

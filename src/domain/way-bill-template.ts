import {
  isTemplateRichContentCell,
  resolveTemplateCellStaticHtml,
} from "@/domain/template-static-content";
import type { TemplateGridCell, TemplateSection } from "@/domain/template-layout";

type WayBillRow = {
  label: string;
  value: string;
};

export const WAY_BILL_SECTION_ORDER = [
  "header_meta",
  "transport",
  "declaration",
  "conditions",
  "goods",
  "transport_charge",
  "containers",
  "amharic",
  "footer",
  "document_id",
] as const;

export const WAY_BILL_TRANSPORT_TH_LABELS: Record<string, string> = {
  wb_to: "To:",
  wb_truck: "Truck No:",
  wb_trailer: "Trailer No:",
  wb_driver: "Driver Name:",
  wb_driver_phone: "Driver Phone No:",
  wb_license: "License No:",
  wb_destination: "Final Destination:",
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
  wb_footer_driver: "Driver Name",
};

export const WAY_BILL_FOOTER_ROW_ORDER = [
  { labelId: "wb_lbl_footer_driver", valueId: "wb_footer_driver" },
  { labelId: "wb_lbl_footer_signature", valueId: "wb_footer_signature" },
  { labelId: "wb_lbl_footer_date", valueId: "wb_footer_date" },
] as const;

export const WAY_BILL_TRANSPORT_LABEL_IDS: Record<string, string> = {
  wb_to: "wb_lbl_to",
  wb_to_contact: "wb_lbl_to_contact_spacer",
  wb_truck: "wb_lbl_truck",
  wb_trailer: "wb_lbl_trailer",
  wb_driver: "wb_lbl_driver",
  wb_driver_phone: "wb_lbl_driver_phone",
  wb_license: "wb_lbl_license",
  wb_destination: "wb_lbl_destination",
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

export function sortWayBillSections(sections: TemplateSection[]): TemplateSection[] {
  const orderIndex = new Map(WAY_BILL_SECTION_ORDER.map((id, index) => [id, index]));

  return sections
    .map((section, index) => ({ section, index }))
    .sort((left, right) => {
      if (left.section.y !== right.section.y) {
        return left.section.y - right.section.y;
      }

      const leftOrder = orderIndex.get(left.section.id as typeof WAY_BILL_SECTION_ORDER[number]);
      const rightOrder = orderIndex.get(right.section.id as typeof WAY_BILL_SECTION_ORDER[number]);
      if (leftOrder !== undefined && rightOrder !== undefined && leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }
      if (leftOrder !== undefined && rightOrder === undefined) {
        return -1;
      }
      if (leftOrder === undefined && rightOrder !== undefined) {
        return 1;
      }

      return left.index - right.index;
    })
    .map(({ section }) => section);
}

export function resolveWayBillFooterValue(rows: WayBillRow[], cell: TemplateGridCell): string {
  const mapped = WAY_BILL_CELL_LABEL_MAP[cell.id];
  if (!mapped) {
    return "";
  }

  return rowValue(rows, mapped);
}

export function isWayBillStaticCell(cell: TemplateGridCell): boolean {
  return isTemplateRichContentCell(cell);
}

export function resolveWayBillStaticHtml(cell: TemplateGridCell): string {
  return resolveTemplateCellStaticHtml(cell);
}

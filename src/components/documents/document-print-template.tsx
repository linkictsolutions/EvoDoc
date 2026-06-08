"use client";

import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { resolveCompanyConfiguration } from "@/domain/company-configuration";
import type { DocumentInputSnapshot, DocumentOutputSnapshot, DocumentType } from "@/types/models";

const ICC_INVOICE_TEMPLATE_STORAGE_KEY = "evodoc.templates.commercial_invoice_icc.v1";
const ICC_PACKING_TEMPLATE_STORAGE_KEY = "evodoc.templates.packing_list_icc.v1";
const SHIPPING_INSTRUCTIONS_TEMPLATE_STORAGE_KEY = "evodoc.templates.shipping_instructions.v1";
const QUALITY_CERT_TEMPLATE_STORAGE_KEY = "evodoc.templates.quality_certificate.v1";
const WEIGHT_CERT_TEMPLATE_STORAGE_KEY = "evodoc.templates.weight_certificate.v1";
const WAY_BILL_TEMPLATE_STORAGE_KEY = "evodoc.templates.way_bill.v1";
const ICO_CERT_TEMPLATE_STORAGE_KEY = "evodoc.templates.ico_certificate.v1";
const ICC_PRINT_GRID_ROW_MM = 4;
const MIN_RENDERED_HEADER_HEIGHT_MM = 32;
const MIN_RENDERED_FOOTER_HEIGHT_MM = 28;

type Props = {
  output: DocumentOutputSnapshot;
  documentId: string;
  input?: DocumentInputSnapshot;
  isFinal?: boolean;
  templateLayout?: string;
};

type Row = { label: string; value: string };

function flattenRows(output: DocumentOutputSnapshot): Row[] {
  return output.sections.flatMap((section) => section.rows);
}

function value(rows: Row[], label: string): string {
  return rows.find((row) => row.label === label)?.value ?? "-";
}

function display(value: string | undefined): string {
  if (!value) {
    return "";
  }

  const normalized = value.trim();
  if (!normalized || normalized === "-") {
    return "";
  }

  return value;
}

type TemplateCell = {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

type TemplateSection = {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minH: number;
  cells: TemplateCell[];
};

type PersistedIccTemplate = {
  version: 1;
  sections: TemplateSection[];
};

function readTemplateFromStorage(storageKey: string): PersistedIccTemplate | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as PersistedIccTemplate;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.sections)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

const ICC_CELL_LABEL_MAP: Record<string, string> = {
  inv_date: "Date",
  inv_sales_ref: "Sales Contract Ref",
  inv_ref1: "Ref No",
  inv_ref2: "Ref No",
  inv_sales_date: "Sales Contract Date",
  inv_exporter: "Exporter/Beneficiary/Seller",
  inv_bank_permit: "Bank Permit Number",
  inv_applicant: "Applicant/Notify",
  inv_bol: "Bill of Lading Number",
  inv_consignee: "Consignee",
  inv_dispatch: "Method of Dispatch",
  inv_eccsa: "ECCSA Certificate of Origin Number",
  inv_vessel: "Vessel & Voyage Number",
  inv_ship_date: "Shipped on Board Date",

  gt_desc: "Description of Goods",
  gt_hs: "HS Code",
  gt_lb: "Quantity in LB (Net)",
  gt_kg_net: "Quantity in KG (Net)",
  gt_kg_gross: "Quantity in KG (Gross)",
  gt_bags: "Packages in Bags",
  gt_unit_price: "Unit Price USC/LB",
  gt_total: "Total Price USD",
  gt_total_value: "Total Amount USD",
  gt_words: "Amount in Words",

  bd_bank_beneficiary: "Bank of Beneficiary",
  bd_bank_address: "Beneficiary Bank Address",
  bd_beneficiary_name: "Beneficiary Name",
  bd_beneficiary_swift: "SWIFT Number",
  bd_beneficiary_acc: "Beneficiary Account Number",
  bd_corr_bank_name: "Correspondent Bank Name",
  bd_corr_bank_address: "Correspondent Bank Address",
  bd_corr_swift: "Correspondent SWIFT Number",
  bd_corr_acc: "Correspondent Account Number",

  ts_origin: "Country of Origin",
  ts_place_issue: "Place of Issue",
  ts_port_loading: "Port of Loading",
  ts_date_issue: "Date of Issue",
  ts_port_discharge: "Port of Discharge",
  ts_final_destination: "Final Destination",
  ts_delivery_term: "Delivery/Trade Term",
  ts_type_shipment: "Type of Shipment",
  ts_incoterm: "Incoterm",
  ts_payment: "Term/Method of Payment",
  ts_packaging_label: "Packaging & Marking (Label)",
  ts_full_marking: "Full Marking",
};

const ICC_GOODS_COLUMN_IDS = new Set([
  "gt_sn",
  "gt_desc",
  "gt_hs",
  "gt_lb",
  "gt_kg_net",
  "gt_kg_gross",
  "gt_bags",
  "gt_unit_price",
  "gt_total",
]);

const QC_CONTAINER_COLUMN_IDS = new Set([
  "qc_ct_container",
  "qc_ct_seal",
  "qc_ct_bags",
]);

const WC_CONTAINER_COLUMN_IDS = new Set([
  "wc_ct_container",
  "wc_ct_seal",
  "wc_ct_bags",
  "wc_ct_bag_net",
  "wc_ct_bag_gross",
  "wc_ct_cont_net",
  "wc_ct_cont_gross",
]);


function readIccInvoiceTemplateFromStorage(): PersistedIccTemplate | null {
  return readTemplateFromStorage(ICC_INVOICE_TEMPLATE_STORAGE_KEY);
}

function readPackingListTemplateFromStorage(): PersistedIccTemplate | null {
  return readTemplateFromStorage(ICC_PACKING_TEMPLATE_STORAGE_KEY);
}

function parseIccTemplate(raw: string | undefined): PersistedIccTemplate | null {
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as PersistedIccTemplate;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.sections)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function normalizeTemplateSections(sections: TemplateSection[]): TemplateSection[] {
  return [...sections]
    .map((section) => ({
      ...section,
      cells: [...(section.cells ?? [])].filter(Boolean).sort((a, b) => (a.y - b.y) || (a.x - b.x) || a.id.localeCompare(b.id)),
    }))
    .sort((a, b) => (a.y - b.y) || a.id.localeCompare(b.id));
}

function cellValue(rows: Row[], cell: TemplateCell): string {
  const mapped = ICC_CELL_LABEL_MAP[cell.id] ?? cell.label;
  return value(rows, mapped);
}

function templateColumnCount(sections: TemplateSection[]): number {
  const maxCol = sections.reduce((acc, section) => Math.max(acc, section.x + section.w), 0);
  // Backward compatible default.
  return maxCol > 12 ? maxCol : 12;
}

function buildTemplateTableRows(section: TemplateSection, cols: number) {
  const cells = [...(section.cells ?? [])].filter(Boolean);
  const maxRow = cells.reduce((acc, cell) => Math.max(acc, cell.y + cell.h), 0);

  const startAt = new Map<string, TemplateCell>();
  for (const cell of cells) {
    startAt.set(`${cell.x},${cell.y}`, cell);
  }

  // Tracks occupied slots due to rowSpan/colSpan.
  const occupied = new Set<string>();

  const rows: Array<Array<{ key: string; cell: TemplateCell; isEmpty?: boolean }>> = [];

  for (let y = 0; y < maxRow; y += 1) {
    const rowCells: Array<{ key: string; cell: TemplateCell; isEmpty?: boolean }> = [];
    for (let x = 0; x < cols; x += 1) {
      const slotKey = `${x},${y}`;
      if (occupied.has(slotKey)) {
        continue;
      }

      const cell = startAt.get(slotKey);
      if (!cell) {
        // Empty slot: emit a 1x1 filler so the table keeps its 12-column structure.
        rowCells.push({
          key: `__empty_${y}_${x}`,
          cell: { id: `__empty_${y}_${x}`, label: "", x, y, w: 1, h: 1 },
          isEmpty: true,
        });
        occupied.add(slotKey);
        continue;
      }

      // Mark all covered slots occupied.
      for (let dy = 0; dy < Math.max(1, cell.h); dy += 1) {
        for (let dx = 0; dx < Math.max(1, cell.w); dx += 1) {
          occupied.add(`${cell.x + dx},${cell.y + dy}`);
        }
      }

      rowCells.push({ key: cell.id, cell });
      x = cell.x + cell.w - 1;
    }
    rows.push(rowCells);
  }

  return { rows, maxRow };
}

function scaleSectionRowsForPrint(section: TemplateSection): { section: TemplateSection; rowScale: number } {
  const cells = [...(section.cells ?? [])].filter(Boolean);
  if (cells.length === 0) {
    return { section, rowScale: 1 };
  }

  const valuesToCheck = [
    section.h,
    section.minH,
    ...cells.flatMap((cell) => [cell.y, cell.h]),
  ];

  const canHalve = valuesToCheck.every((value) => Number.isFinite(value) && value >= 0 && value % 2 === 0);
  if (!canHalve) {
    return { section, rowScale: 1 };
  }

  return {
    rowScale: 2,
    section: {
      ...section,
      h: section.h / 2,
      minH: section.minH / 2,
      cells: cells.map((cell) => ({
        ...cell,
        y: cell.y / 2,
        h: Math.max(1, cell.h / 2),
      })),
    },
  };
}

function isSpacerCell(cell: TemplateCell) {
  return cell.label === "(spacer)" || cell.label === "(spacer no border)" || cell.id.includes("spacer");
}

function isBorderlessSpacerCell(cell: TemplateCell) {
  return cell.label === "(spacer no border)" || cell.id.includes("spacer_borderless");
}

function IccInvoiceTemplatePrintView({ output, documentId, isFinal, template }: Props & { template: PersistedIccTemplate }) {
  const rows = flattenRows(output);
  const sections = normalizeTemplateSections(template.sections);
  const cols = templateColumnCount(sections);
  const colCountForPrint = Math.min(12, cols);
  const scaleX = cols / colCountForPrint;

  return (
    <article className="print-sheet icc-sheet">
	      {sections.map((section) => {
        if (section.id === "document_id") {
          return (
            <p key={section.id} className="permit-doc-id">
              Document ID: {documentId}
            </p>
          );
        }

        let normalizedSection: TemplateSection = section;
        let spacerRowScale = 1;
        let goodsHeaderY: number | null = null;
        let goodsRowY: number | null = null;

        if (section.id === "goods_table") {
          const cells = [...(section.cells ?? [])];
          const goodsHeaders = cells.filter((cell) => ICC_GOODS_COLUMN_IDS.has(cell.id));
          const headerY = goodsHeaders.reduce((acc, cell) => Math.min(acc, cell.y), Number.POSITIVE_INFINITY);
          goodsHeaderY = Number.isFinite(headerY) ? headerY : 0;
          const rowPlaceholder = cells.find((cell) => cell.id === "gt_row") ?? null;
          goodsRowY = rowPlaceholder ? rowPlaceholder.y : (goodsHeaderY + 1);
          const rowH = rowPlaceholder ? rowPlaceholder.h : 2;

          // Create a virtual "row values" band by duplicating each goods header cell at the rowY position.
          // This keeps the table renderer generic while allowing column deletions to affect row values.
          const virtualValueCells = goodsHeaders.map((cell) => ({ ...cell, y: goodsRowY!, h: rowH }));
          normalizedSection = {
            ...section,
            cells: [...cells.filter((cell) => cell.id !== "gt_row"), ...virtualValueCells],
          };
        }

        if (section.id !== "goods_table") {
          const scaled = scaleSectionRowsForPrint(normalizedSection);
          normalizedSection = scaled.section;
          spacerRowScale = scaled.rowScale;
        }

        if (cols > colCountForPrint) {
          normalizedSection = {
            ...normalizedSection,
            x: Math.floor(normalizedSection.x / scaleX),
            w: Math.max(1, Math.round(normalizedSection.w / scaleX)),
            cells: (normalizedSection.cells ?? []).map((cell) => ({
              ...cell,
              x: Math.floor(cell.x / scaleX),
              w: Math.max(1, Math.round(cell.w / scaleX)),
            })),
          };
        }

        const { rows: tableRows } = buildTemplateTableRows(normalizedSection, colCountForPrint);

        return (
          <table
            key={section.id}
            className="print-table icc-table mt-sm"
            style={{ tableLayout: "fixed", borderCollapse: "collapse" }}
          >
            <colgroup>
              {Array.from({ length: colCountForPrint }).map((_, index) => (
                <col key={index} style={{ width: `${100 / colCountForPrint}%` }} />
              ))}
            </colgroup>
            <tbody>
              {tableRows.map((rowCells, rowIndex) => (
                <tr key={rowIndex}>
                  {rowCells.map(({ key, cell, isEmpty }) => {
                    if (isEmpty) {
                      return (
                        <td
                          key={key}
                          colSpan={1}
                          rowSpan={1}
                          style={{
                            background: "transparent",
                            border: "none",
                            padding: 0,
                          }}
                        />
                      );
                    }
                    const isSpacer = isSpacerCell(cell);
                    const isBorderlessSpacer = isBorderlessSpacerCell(cell);
                    const isHeaderLike =
                      cell.id.endsWith("_hdr")
                      || cell.id.endsWith("_title")
                      || cell.id === "inv_title"
                      || cell.id === "inv_page";

                    const isGoodsHeader = section.id === "goods_table"
                      && goodsHeaderY !== null
                      && ICC_GOODS_COLUMN_IDS.has(cell.id)
                      && cell.y === goodsHeaderY;
                    const isGoodsValue = section.id === "goods_table"
                      && goodsRowY !== null
                      && ICC_GOODS_COLUMN_IDS.has(cell.id)
                      && cell.y === goodsRowY;

                    const v = display(cellValue(rows, cell));
                    const labelWithColon = cell.label.endsWith(":") ? cell.label : `${cell.label}:`;

                    const content: ReactNode = (() => {
                      if (cell.id === "inv_title") {
                        return <strong>COMMERCIAL INVOICE</strong>;
                      }
                      if (cell.id === "inv_page") {
                        return <strong>PAGE 1 OF 1 | {isFinal ? "FINAL" : "ORIGINAL"}</strong>;
                      }
                      if (cell.id === "gt_total_label") {
                        return <strong>TOTAL AMOUNT IN USD</strong>;
                      }
                      if (cell.id === "gt_total_value") {
                        return <strong>{display(value(rows, "Total Amount USD"))}</strong>;
                      }
                      if (cell.id === "gt_words") {
                        const words = display(value(rows, "Amount in Words"));
                        return (
                          <>
                            <strong>AMOUNT IN WORDS:</strong> {words || ""}
                          </>
                        );
                      }
                      if (cell.id === "ts_full_marking") {
                        return (
                          <>
                            <strong>FULL MARKING</strong>
                            <br />
                            <span style={{ fontWeight: 400 }}>{v}</span>
                          </>
                        );
                      }
                      if (isGoodsHeader) {
                        return <strong>{cell.label}</strong>;
                      }
                      if (isGoodsValue) {
                        const mapped = ICC_CELL_LABEL_MAP[cell.id] ?? cell.label;
                        const valueText = cell.id === "gt_sn" ? "1" : display(value(rows, mapped));
                        return <span style={{ fontWeight: 400 }}>{valueText}</span>;
                      }
                      if (isSpacer) {
                        return null;
                      }
                      if (isHeaderLike) {
                        return <strong>{cell.label}</strong>;
                      }
                      return (
                        <>
                          <strong>{labelWithColon}</strong>{" "}
                          <span style={{ fontWeight: 400 }}>{v}</span>
                        </>
                      );
                    })();

                    return (
                      <td
                        key={key}
                        colSpan={Math.max(1, cell.w)}
                        rowSpan={Math.max(1, cell.h)}
                        style={{
                          background: isBorderlessSpacer ? "transparent" : (isHeaderLike || isGoodsHeader ? "#f6f6f6" : "white"),
                          fontWeight: 500,
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                          verticalAlign: "top",
                          height: isSpacer ? `${Math.max(1, cell.h) * ICC_PRINT_GRID_ROW_MM * spacerRowScale}mm` : undefined,
                          border: isBorderlessSpacer ? "none" : undefined,
                          textAlign: (
                            cell.id === "inv_page"
                            || cell.id === "gt_total_label"
                          ) ? "right" : undefined,
                        }}
                      >
                        {content}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        );
      })}
    </article>
  );
}

function GenericTemplatePrintView({
  rows,
  documentId,
  template,
  isFinal,
  cellValueFor,
  tableSectionConfig,
}: {
  rows: Row[];
  documentId: string;
  template: PersistedIccTemplate;
  isFinal?: boolean;
  cellValueFor: (rows: Row[], cell: TemplateCell) => string;
  tableSectionConfig?: Record<string, { columnIds: Set<string>; rowPlaceholderId: string }>;
}) {
  const sections = normalizeTemplateSections(template.sections);
  const cols = templateColumnCount(sections);
  const colCountForPrint = Math.min(12, cols);
  const scaleX = cols / colCountForPrint;

  return (
    <article className="print-sheet icc-sheet">
      {sections.map((section) => {
        if (section.id === "document_id") {
          return (
            <p key={section.id} className="permit-doc-id">
              Document ID: {documentId}
            </p>
          );
        }

        let normalizedSection: TemplateSection = section;
        let spacerRowScale = 1;
        let tableHeaderY: number | null = null;
        let tableValueY: number | null = null;

        const tableConfig = tableSectionConfig?.[section.id];
        if (tableConfig) {
          const cells = [...(section.cells ?? [])];
          const headerCells = cells.filter((cell) => tableConfig.columnIds.has(cell.id));
          const headerY = headerCells.reduce((acc, cell) => Math.min(acc, cell.y), Number.POSITIVE_INFINITY);
          tableHeaderY = Number.isFinite(headerY) ? headerY : 0;
          const rowPlaceholder = cells.find((cell) => cell.id === tableConfig.rowPlaceholderId) ?? null;
          const rowY = rowPlaceholder ? rowPlaceholder.y : (tableHeaderY + 1);
          const rowH = rowPlaceholder ? rowPlaceholder.h : 2;
          tableValueY = rowY;
          const virtualValueCells = headerCells.map((cell) => ({ ...cell, y: rowY, h: rowH }));
          normalizedSection = {
            ...section,
            cells: [...cells.filter((cell) => cell.id !== tableConfig.rowPlaceholderId), ...virtualValueCells],
          };
        } else {
          const scaled = scaleSectionRowsForPrint(normalizedSection);
          normalizedSection = scaled.section;
          spacerRowScale = scaled.rowScale;
        }

        if (cols > colCountForPrint) {
          normalizedSection = {
            ...normalizedSection,
            x: Math.floor(normalizedSection.x / scaleX),
            w: Math.max(1, Math.round(normalizedSection.w / scaleX)),
            cells: (normalizedSection.cells ?? []).map((cell) => ({
              ...cell,
              x: Math.floor(cell.x / scaleX),
              w: Math.max(1, Math.round(cell.w / scaleX)),
            })),
          };
        }

        const { rows: tableRows } = buildTemplateTableRows(normalizedSection, colCountForPrint);

        return (
          <table
            key={section.id}
            className="print-table icc-table mt-sm"
            style={{ tableLayout: "fixed", borderCollapse: "collapse" }}
          >
            <colgroup>
              {Array.from({ length: colCountForPrint }).map((_, index) => (
                <col key={index} style={{ width: `${100 / colCountForPrint}%` }} />
              ))}
            </colgroup>
            <tbody>
              {tableRows.map((rowCells, rowIndex) => (
                <tr key={rowIndex}>
                  {rowCells.map(({ key, cell, isEmpty }) => {
                    if (isEmpty) {
                      return (
                        <td
                          key={key}
                          colSpan={1}
                          rowSpan={1}
                          style={{
                            background: "transparent",
                            border: "none",
                            padding: 0,
                          }}
                        />
                      );
                    }

                    const isSpacer = isSpacerCell(cell);
                    const isBorderlessSpacer = isBorderlessSpacerCell(cell);
                    const isHeaderLike =
                      cell.id.endsWith("_hdr")
                      || cell.id.endsWith("_title")
                      || cell.id.endsWith("_page");

                    const isTableHeader = Boolean(tableConfig)
                      && tableHeaderY !== null
                      && (tableConfig?.columnIds.has(cell.id) ?? false)
                      && cell.y === tableHeaderY;
                    const isTableValue = Boolean(tableConfig)
                      && tableValueY !== null
                      && (tableConfig?.columnIds.has(cell.id) ?? false)
                      && cell.y === tableValueY;

                    const raw = cellValueFor(rows, cell);
                    const v = display(raw);
                    const labelWithColon = cell.label.trim().endsWith(":") ? cell.label.trim() : `${cell.label.trim()}:`;

                    const content = (() => {
                      if (isSpacer) return null;
                      if (isTableHeader) {
                        return <strong>{cell.label}</strong>;
                      }
                      if (isTableValue) {
                        return <span style={{ fontWeight: 400 }}>{v}</span>;
                      }
                      if (isHeaderLike) {
                        // Allow invoice/packing to decide ORIGINAL/FINAL based on isFinal via custom cells.
                        if (cell.id.endsWith("_page") && v) {
                          return <strong>{v}</strong>;
                        }
                        return <strong>{cell.label}</strong>;
                      }
                      if (!v) {
                        return null;
                      }
                      return (
                        <>
                          <strong>{labelWithColon}</strong>{" "}
                          <span style={{ fontWeight: 400 }}>{v}</span>
                        </>
                      );
                    })();

                    return (
                      <td
                        key={key}
                        colSpan={Math.max(1, cell.w)}
                        rowSpan={Math.max(1, cell.h)}
                        style={{
                          background: isBorderlessSpacer ? "transparent" : (isHeaderLike || isTableHeader ? "#f6f6f6" : "white"),
                          fontWeight: 500,
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                          verticalAlign: "top",
                          height: isSpacer ? `${Math.max(1, cell.h) * ICC_PRINT_GRID_ROW_MM * spacerRowScale}mm` : undefined,
                          border: isBorderlessSpacer ? "none" : undefined,
                        }}
                      >
                        {content}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        );
      })}
    </article>
  );
}

function IccInvoicePrintView({ output, documentId, isFinal, templateLayout }: Props) {
  const rows = flattenRows(output);
  const template = useMemo(() => {
    const fromPayload = parseIccTemplate(templateLayout);
    if (fromPayload) {
      return fromPayload;
    }
    return readIccInvoiceTemplateFromStorage();
  }, [templateLayout]);
  if (template) {
    return (
      <IccInvoiceTemplatePrintView output={output} input={undefined} documentId={documentId} isFinal={isFinal} template={template} />
    );
  }

  return (
    <article className="print-sheet icc-sheet">
      <table className="print-table icc-table">
        <tbody>
          <tr>
            <td colSpan={5}><strong>COMMERCIAL INVOICE</strong></td>
            <td colSpan={5} className="table-align-right">
              <strong>PAGE 1 OF 1 | {isFinal ? "FINAL" : "ORIGINAL"}</strong>
            </td>
          </tr>
          <tr>
            <td colSpan={5}><strong>Date:</strong> {display(value(rows, "Date"))}</td>
            <td colSpan={3}><strong>Sales Contract Ref:</strong> {display(value(rows, "Sales Contract Ref"))}</td>
            <td colSpan={2}><strong>Ref No:</strong> {display(value(rows, "Ref No"))}</td>
          </tr>
          <tr>
            <td colSpan={5}><strong>Ref No:</strong> {display(value(rows, "Ref No"))}</td>
            <td colSpan={5}><strong>Sales Contract Date:</strong> {display(value(rows, "Sales Contract Date"))}</td>
          </tr>
          <tr>
            <td colSpan={5}><strong>Exporter/Beneficiary/Seller</strong><br />{display(value(rows, "Exporter/Beneficiary/Seller"))}</td>
            <td colSpan={5}><strong>Bank Permit Number:</strong> {display(value(rows, "Bank Permit Number"))}</td>
          </tr>
          <tr>
            <td colSpan={5}><strong>Applicant/Notify</strong><br />{display(value(rows, "Applicant/Notify"))}</td>
            <td colSpan={5}><strong>Bill of Lading Number:</strong> {display(value(rows, "Bill of Lading Number"))}</td>
          </tr>
          <tr>
            <td colSpan={5}><strong>Consignee</strong><br />{display(value(rows, "Consignee"))}</td>
            <td colSpan={5}><strong>Method of Dispatch:</strong> {display(value(rows, "Method of Dispatch"))}</td>
          </tr>
          <tr>
            <td colSpan={5}><strong>ECCSA - Certificate of Origin Number:</strong> {display(value(rows, "ECCSA Certificate of Origin Number"))}</td>
            <td colSpan={5}><strong>Vessel &amp; Voyage Number:</strong> {display(value(rows, "Vessel & Voyage Number"))}</td>
          </tr>
          <tr>
            <td colSpan={5}></td>
            <td colSpan={5}><strong>Shipped on Board Date:</strong> {display(value(rows, "Shipped on Board Date"))}</td>
          </tr>
        </tbody>
      </table>

      <table className="print-table icc-table icc-footer-table mt-sm">
        <thead>
          <tr>
            <th>S / N</th>
            <th>DESCRIPTION OF GOODS</th>
            <th>HS CODE</th>
            <th>QUANTITY IN LB (NET)</th>
            <th>QUANTITY IN KG (NET)</th>
            <th>QUANTITY IN KG (GROSS)</th>
            <th>PACKAGES IN BAGS</th>
            <th>UNIT PRICE USC/LB</th>
            <th>TOTAL PRICE USD</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>1</td>
            <td>{display(value(rows, "Description of Goods"))}</td>
            <td>{display(value(rows, "HS Code"))}</td>
            <td>{display(value(rows, "Quantity in LB (Net)"))}</td>
            <td>{display(value(rows, "Quantity in KG (Net)"))}</td>
            <td>{display(value(rows, "Quantity in KG (Gross)"))}</td>
            <td>{display(value(rows, "Packages in Bags"))}</td>
            <td>{display(value(rows, "Unit Price USC/LB"))}</td>
            <td>{display(value(rows, "Total Price USD"))}</td>
          </tr>
          <tr>
            <td colSpan={8} className="table-align-right"><strong>TOTAL AMOUNT IN USD</strong></td>
            <td><strong>{display(value(rows, "Total Amount USD"))}</strong></td>
          </tr>
          <tr>
            <td colSpan={9}><strong>AMOUNT IN WORDS:</strong> {display(value(rows, "Amount in Words"))}</td>
          </tr>
        </tbody>
      </table>

      <table className="print-table icc-table mt-sm">
        <tbody>
          <tr>
            <td colSpan={5}><strong>Bank Details (Beneficiary)</strong></td>
            <td colSpan={4}><strong>Correspondent Bank</strong></td>
          </tr>
          <tr>
            <td colSpan={3}><strong>Bank of Beneficiary:</strong> {display(value(rows, "Bank of Beneficiary"))}</td>
            <td colSpan={2}><strong>Address of Bank:</strong> {display(value(rows, "Beneficiary Bank Address"))}</td>
            <td colSpan={2}><strong>Bank Name:</strong> {display(value(rows, "Correspondent Bank Name"))}</td>
            <td colSpan={2}><strong>Address:</strong> {display(value(rows, "Correspondent Bank Address"))}</td>
          </tr>
          <tr>
            <td colSpan={3}><strong>Name of Beneficiary:</strong> {display(value(rows, "Beneficiary Name"))}</td>
            <td colSpan={2}><strong>SWIFT Number:</strong> {display(value(rows, "SWIFT Number"))}</td>
            <td colSpan={2}><strong>SWIFT Number:</strong> {display(value(rows, "Correspondent SWIFT Number"))}</td>
            <td colSpan={2}><strong>Acc. No:</strong> {display(value(rows, "Correspondent Account Number"))}</td>
          </tr>
          <tr>
            <td colSpan={5}><strong>Beneficiaries Acc. No:</strong> {display(value(rows, "Beneficiary Account Number"))}</td>
            <td colSpan={4}></td>
          </tr>
        </tbody>
      </table>

      <table className="print-table icc-table mt-sm">
        <tbody>
          <tr>
            <td><strong>Country of Origin:</strong> {display(value(rows, "Country of Origin"))}</td>
            <td><strong>Place of Issue:</strong> {display(value(rows, "Place of Issue"))}</td>
          </tr>
          <tr>
            <td><strong>Port of Loading:</strong> {display(value(rows, "Port of Loading"))}</td>
            <td><strong>Date of Issue:</strong> {display(value(rows, "Date of Issue"))}</td>
          </tr>
          <tr>
            <td><strong>Port of Discharge:</strong> {display(value(rows, "Port of Discharge"))}</td>
            <td><strong>Signatory Company:</strong> -</td>
          </tr>
          <tr>
            <td><strong>Final Destination:</strong> {display(value(rows, "Final Destination"))}</td>
            <td><strong>Name of Authorized Signatory:</strong> -</td>
          </tr>
          <tr>
            <td><strong>Delivery/Trade Term:</strong> {display(value(rows, "Delivery/Trade Term"))}</td>
            <td rowSpan={2}>
              We hereby certify that this invoice is in all respects correct and true, as regards to both
              the prices and description of the goods referred to herein, and that the country of origin
              of the goods is Ethiopia.
            </td>
          </tr>
          <tr>
            <td><strong>Type of Shipment:</strong> {display(value(rows, "Type of Shipment"))}</td>
          </tr>
          <tr>
            <td><strong>Incoterm:</strong> {display(value(rows, "Incoterm"))}</td>
            <td><strong>Authorized Signature &amp; Company Seal/Stamp</strong></td>
          </tr>
          <tr>
            <td><strong>Term/Method of Payment:</strong> {display(value(rows, "Term/Method of Payment"))}</td>
            <td></td>
          </tr>
          <tr>
            <td className="preserve-linebreaks"><strong>Packaging &amp; Marking (Label):</strong> {display(value(rows, "Packaging & Marking (Label)"))}</td>
            <td></td>
          </tr>
          <tr className="icc-full-marking-row">
            <td className="icc-full-marking-cell preserve-linebreaks"><strong>FULL MARKING</strong><br />{display(value(rows, "Full Marking"))}</td>
            <td className="icc-signature-cell"></td>
          </tr>
        </tbody>
      </table>

      <p className="permit-doc-id">Document ID: {documentId}</p>
    </article>
  );
}

const PACKING_CELL_LABEL_MAP: Record<string, string> = {
  pl_date: "Date",
  pl_sales_ref: "Sales Contract Ref",
  pl_ref_no: "Ref No",
  pl_sales_date: "Sales Contract Date",
  pl_exporter: "Exporter/Beneficiary/Seller",
  pl_bank_permit: "Bank Permit Number",
  pl_applicant: "Applicant/Notify",
  pl_bol: "Bill of Lading Number",
  pl_consignee: "Consignee",
  pl_ship_date: "Shipped on Board Date",
  pl_shipping_line: "Shipping Line",
  pl_vessel: "Vessel Name",
  pl_voyage: "Voyage No",
  pl_eccsa: "ECCSA Certificate of Origin Number",

  gd_desc: "Description of Goods",
  gd_hs: "HS Code",

  tt_origin: "Country of Origin",
  tt_place_issue: "Place of Issue",
  tt_port_loading: "Port of Loading",
  tt_date_issue: "Date of Issue",
  tt_port_discharge: "Port of Discharge",
  tt_signatory_company: "Signatory Company",
  tt_final_destination: "Final Destination",
  tt_auth_sign_name: "Authorized Signatory Name",
  tt_delivery_term: "Delivery/Trade Term",
  tt_declaration: "Declaration",
  tt_type_shipment: "Type of Shipment",
  tt_incoterm: "Incoterm",
  tt_payment: "Term/Method of Payment",
  tt_total_net: "Total Net Weight (MT)",
  tt_packaging_label: "Packaging & Marking (Label)",
  tt_total_gross: "Total Gross Weight (MT)",
  tt_packing_date: "Packing Date",
  tt_packing_place: "Packing Place",
  tt_address: "Address",

  fm_full_marking: "Full Marking",
};

const SHIPPING_CELL_LABEL_MAP: Record<string, string> = {
  si_date: "Date",
  si_ref: "Ref No",
  si_shipper: "Shipper",
  si_consignee: "Consignee",
  si_notify: "Notify",
  si_notify2: "Second Notify",
  si_service_contract: "Service Contract No",
  si_cargo_desc: "Cargo Description",
  si_hs: "HS Code",
  si_qty: "Quantity",
  si_gross: "Gross Weight",
  si_net: "Net Weight",
  si_cert_number: "Cert Number",
  si_container_size: "Number Type and Size of Containers",
  si_additional: "Additional Document / Remark",
  si_port_loading: "Port of Loading",
  si_discharge: "Place of Discharge",
  si_booking: "Booking Number",
  si_etd: "Vessel Departure (ETD) / Date",
};

const QUALITY_CELL_LABEL_MAP: Record<string, string> = {
  qc_date: "Date",
  qc_ref: "Ref No",
  qc_statement: "Statement",
  qc_mode: "Mode of Transportation",
  qc_moisture: "Moisture Content",
  qc_shipper: "Shipper",
  qc_notify: "Notify",
  qc_notify2: "Second Notify",
  qc_desc: "Description of Goods",
  qc_origin: "Origin",
  qc_quality: "Quality",
  qc_ico_no: "ICO No",
  qc_cert_no: "Cert No",
  qc_net_weight: "Net Weight",
  qc_gross_weight: "Gross Weight",
  qc_qty_lb: "Quantity in LB",
  qc_from: "From",
  qc_to: "To",
  qc_signatory: "Signatory Company",
};

const WEIGHT_CELL_LABEL_MAP: Record<string, string> = {
  wc_date: "Date",
  wc_ref: "Ref No",
  wc_shipper: "Shipper",
  wc_notify: "Notify",
  wc_notify2: "Second Notify",
  wc_desc: "Description of Goods",
  wc_origin: "Origin",
  wc_quality: "Quality",
  wc_net_weight: "Net Weight",
  wc_gross_weight: "Gross Weight",
  wc_qty_lb: "Quantity in LB",
  wc_cert_no: "Cert No",
  wc_signatory: "Signatory Company",
};

const WAY_BILL_CELL_LABEL_MAP: Record<string, string> = {
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
};

const ICO_CELL_LABEL_MAP: Record<string, string> = {
  ico_exporter: "1 Exporter/Consignor",
  ico_notify_address: "2 Notify Address",
  ico_internal_ref: "3 Internal Reference No",
  ico_country_code: "4 Country Code",
  ico_port_code: "4 Port Code",
  ico_serial_no: "4 Serial No",
  ico_producing_country: "5 Producing Country",
  ico_destination_country: "6 Country of Destination",
  ico_export_date: "7 Date of Export (DD/MM/YY)",
  ico_transshipment_country: "8 Country of Trans-shipment",
  ico_carrier: "9 Name of Carrier",
  ico_ident_mark: "10 ICO Identification Mark",
  ico_net_weight: "12 Net Weight of Shipment",
  ico_unit_weight: "13 Unit of Weight",
  ico_coffee_desc: "14 Description of coffee",
};

const PACKING_CONTAINER_COLUMN_IDS = new Set([
  "ct_container",
  "ct_seal",
  "ct_packages",
  "ct_net_kgs",
  "ct_gross_kgs",
]);

function packingCellValue(rows: Row[], cell: TemplateCell): string {
  const mapped = PACKING_CELL_LABEL_MAP[cell.id] ?? cell.label;
  return value(rows, mapped);
}

function shippingCellValue(rows: Row[], cell: TemplateCell): string {
  if (cell.id === "si_title") {
    return "SHIPPING INSTRUCTION";
  }
  if (cell.id === "si_page") {
    return "PAGE 1 OF 1";
  }
  if (cell.id === "si_container_rows") {
    const containers = indexedValues(rows, "Container No ");
    const seals = indexedValues(rows, "Seal No ");
    const certs = indexedValues(rows, "Cert No ");
    const fallbackContainers = indexedValues(rows, "Container ");
    const fallbackSeals = indexedValues(rows, "Seal ");
    const fallbackCerts = indexedValues(rows, "Cert ");
    const lineIndexes = Array.from(new Set([
      ...containers.keys(),
      ...seals.keys(),
      ...certs.keys(),
      ...fallbackContainers.keys(),
      ...fallbackSeals.keys(),
      ...fallbackCerts.keys(),
    ])).sort((a, b) => a - b);
    const lines = lineIndexes.map((index) => {
      const container = display(containers.get(index) ?? fallbackContainers.get(index));
      const seal = display(seals.get(index) ?? fallbackSeals.get(index));
      const cert = display(certs.get(index) ?? fallbackCerts.get(index));
      if (!container && !seal && !cert) return "";
      return [container ? `Container ${container}` : "", seal ? `Seal ${seal}` : "", cert ? `Cert ${cert}` : ""].filter(Boolean).join(" | ");
    }).filter(Boolean);
    return lines.join("\n");
  }
  const mapped = SHIPPING_CELL_LABEL_MAP[cell.id] ?? cell.label;
  return value(rows, mapped);
}

function qualityCellValue(rows: Row[], cell: TemplateCell): string {
  if (cell.id === "qc_title") {
    return "CERTIFICATE OF QUALITY";
  }
  if (QC_CONTAINER_COLUMN_IDS.has(cell.id)) {
    const index = 1;
    if (cell.id === "qc_ct_container") return indexedValues(rows, "Container No ").get(index) ?? "-";
    if (cell.id === "qc_ct_seal") return indexedValues(rows, "Seal No ").get(index) ?? "-";
    if (cell.id === "qc_ct_bags") return indexedValues(rows, "Bags per Container ").get(index) ?? "-";
  }
  const mapped = QUALITY_CELL_LABEL_MAP[cell.id] ?? cell.label;
  return value(rows, mapped);
}

function weightCellValue(rows: Row[], cell: TemplateCell): string {
  if (cell.id === "wc_title") {
    return "CERTIFICATE OF WEIGHT";
  }
  if (WC_CONTAINER_COLUMN_IDS.has(cell.id)) {
    const index = 1;
    if (cell.id === "wc_ct_container") return indexedValues(rows, "Container No ").get(index) ?? "-";
    if (cell.id === "wc_ct_seal") return indexedValues(rows, "Seal No ").get(index) ?? "-";
    if (cell.id === "wc_ct_bags") return indexedValues(rows, "Bags per Container ").get(index) ?? "-";
    if (cell.id === "wc_ct_bag_net") return indexedValues(rows, "Bag Weight Net ").get(index) ?? "-";
    if (cell.id === "wc_ct_bag_gross") return indexedValues(rows, "Bag Weight Gross ").get(index) ?? "-";
    if (cell.id === "wc_ct_cont_net") return indexedValues(rows, "Container Net Weight ").get(index) ?? "-";
    if (cell.id === "wc_ct_cont_gross") return indexedValues(rows, "Container Gross Weight ").get(index) ?? "-";
  }
  const mapped = WEIGHT_CELL_LABEL_MAP[cell.id] ?? cell.label;
  return value(rows, mapped);
}

function wayBillCellValue(rows: Row[], cell: TemplateCell): string {
  if (cell.id === "wb_title") {
    return "WAY BILL";
  }
  const mapped = WAY_BILL_CELL_LABEL_MAP[cell.id] ?? cell.label;
  return value(rows, mapped);
}

function icoCellValue(rows: Row[], cell: TemplateCell): string {
  if (cell.id === "ico_title") {
    return "ICO CERTIFICATE OF ORIGIN";
  }
  const mapped = ICO_CELL_LABEL_MAP[cell.id] ?? cell.label;
  return value(rows, mapped);
}

function PackingListIccTemplatePrintView({ output, documentId, isFinal, template }: Props & { template: PersistedIccTemplate }) {
  const rows = flattenRows(output);
  const sections = normalizeTemplateSections(template.sections);
  const cols = templateColumnCount(sections);
  const colCountForPrint = Math.min(12, cols);
  const scaleX = cols / colCountForPrint;

  const containers = indexedValues(rows, "Container No ");
  const seals = indexedValues(rows, "Seal No ");
  const packages = indexedValues(rows, "No. of Packages ");
  const netWeights = indexedValues(rows, "Net Weight in KGS ");
  const grossWeights = indexedValues(rows, "Gross Weight in KGS ");
  const lineIndexes = Array.from(new Set([
    ...containers.keys(),
    ...seals.keys(),
    ...packages.keys(),
    ...netWeights.keys(),
    ...grossWeights.keys(),
  ])).sort((a, b) => a - b);

  return (
    <article className="print-sheet packing-icc-sheet">
      {sections.map((section) => {
        if (section.id === "document_id") {
          return (
            <p key={section.id} className="permit-doc-id">
              Document ID: {documentId}
            </p>
          );
        }

        let normalizedSection: TemplateSection = section;
        let spacerRowScale = 1;

        if (section.id !== "container_table") {
          const scaled = scaleSectionRowsForPrint(normalizedSection);
          normalizedSection = scaled.section;
          spacerRowScale = scaled.rowScale;
        }

        if (cols > colCountForPrint) {
          normalizedSection = {
            ...normalizedSection,
            x: Math.floor(normalizedSection.x / scaleX),
            w: Math.max(1, Math.round(normalizedSection.w / scaleX)),
            cells: (normalizedSection.cells ?? []).map((cell) => ({
              ...cell,
              x: Math.floor(cell.x / scaleX),
              w: Math.max(1, Math.round(cell.w / scaleX)),
            })),
          };
        }

        if (section.id === "container_table") {
          const cells = [...(normalizedSection.cells ?? [])];
          const headers = cells.filter((cell) => PACKING_CONTAINER_COLUMN_IDS.has(cell.id));
          const headerY = headers.reduce((acc, cell) => Math.min(acc, cell.y), Number.POSITIVE_INFINITY);
          const normalizedHeaderY = Number.isFinite(headerY) ? headerY : 0;
          const active = headers
            .filter((cell) => cell.y === normalizedHeaderY)
            .sort((a, b) => (a.x - b.x) || a.id.localeCompare(b.id));

          return (
            <table key={section.id} className="print-table packing-icc-table mt-sm">
              <colgroup>
                {Array.from({ length: colCountForPrint }).map((_, index) => (
                  <col key={index} style={{ width: `${100 / colCountForPrint}%` }} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  {active.map((cell) => (
                    <th key={cell.id} colSpan={Math.max(1, cell.w)}>
                      {cell.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lineIndexes.length > 0 ? (
                  lineIndexes.map((index) => (
                    <tr key={`packing-template-line-${index}`}>
                      {active.map((cell) => {
                        const v = (() => {
                          if (cell.id === "ct_container") return display(containers.get(index));
                          if (cell.id === "ct_seal") return display(seals.get(index));
                          if (cell.id === "ct_packages") return display(packages.get(index));
                          if (cell.id === "ct_net_kgs") return display(netWeights.get(index));
                          if (cell.id === "ct_gross_kgs") return display(grossWeights.get(index));
                          return "";
                        })();
                        return <td key={`${cell.id}-${index}`}>{v}</td>;
                      })}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={active.reduce((acc, cell) => acc + Math.max(1, cell.w), 0) || colCountForPrint}>
                      No container lines yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          );
        }

        const { rows: tableRows } = buildTemplateTableRows(normalizedSection, colCountForPrint);

        return (
          <table key={section.id} className="print-table packing-icc-table mt-sm" style={{ tableLayout: "fixed", borderCollapse: "collapse" }}>
            <colgroup>
              {Array.from({ length: colCountForPrint }).map((_, index) => (
                <col key={index} style={{ width: `${100 / colCountForPrint}%` }} />
              ))}
            </colgroup>
            <tbody>
              {tableRows.map((rowCells, rowIndex) => (
                <tr key={rowIndex}>
                  {rowCells.map(({ key, cell, isEmpty }) => {
                    if (isEmpty) {
                      return (
                        <td
                          key={key}
                          colSpan={1}
                          rowSpan={1}
                          style={{
                            background: "transparent",
                            border: "none",
                            padding: 0,
                          }}
                        />
                      );
                    }

                    const isSpacer = cell.label === "(spacer)" || cell.id.includes("spacer");
                    const isHeaderLike = cell.id.endsWith("_hdr") || cell.id.endsWith("_title") || cell.id === "pl_title" || cell.id === "pl_page";
                    const v = display(packingCellValue(rows, cell));
                    const labelWithColon = cell.label.endsWith(":") ? cell.label : `${cell.label}:`;

                    const content: ReactNode = (() => {
                      if (cell.id === "pl_title") {
                        return <strong>PACKING LIST</strong>;
                      }
                      if (cell.id === "pl_page") {
                        return <strong>PAGE 1 OF 1 | {isFinal ? "FINAL" : "ORIGINAL"}</strong>;
                      }
                      if (isSpacer) {
                        return null;
                      }
                      if (isHeaderLike) {
                        return <strong>{cell.label}</strong>;
                      }
                      // Cells that behave like invoice multiline blocks.
                      if (cell.id === "pl_exporter" || cell.id === "pl_applicant" || cell.id === "pl_consignee") {
                        return (
                          <>
                            <strong>{cell.label}</strong>
                            <br />
                            <span style={{ fontWeight: 400 }}>{v}</span>
                          </>
                        );
                      }
                      if (cell.id === "tt_declaration") {
                        return <span style={{ fontWeight: 400 }}>{v}</span>;
                      }
                      if (cell.id === "fm_signature") {
                        return <strong>{cell.label}</strong>;
                      }
                      if (cell.id === "fm_full_marking") {
                        return (
                          <>
                            <strong>FULL MARKING:</strong>
                            <br />
                            <span style={{ fontWeight: 400 }}>{v}</span>
                          </>
                        );
                      }
                      if (cell.id === "gd_desc" || cell.id === "gd_hs") {
                        return (
                          <>
                            <strong>{labelWithColon}</strong>{" "}
                            <span style={{ fontWeight: 400 }}>{v}</span>
                          </>
                        );
                      }
                      return (
                        <>
                          <strong>{labelWithColon}</strong>{" "}
                          <span style={{ fontWeight: 400 }}>{v}</span>
                        </>
                      );
                    })();

                    return (
                      <td
                        key={key}
                        colSpan={Math.max(1, cell.w)}
                        rowSpan={Math.max(1, cell.h)}
                        style={{
                          background: isHeaderLike ? "#f6f6f6" : "white",
                          fontWeight: 500,
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                          verticalAlign: "top",
                          height: isSpacer ? `${Math.max(1, cell.h) * ICC_PRINT_GRID_ROW_MM * spacerRowScale}mm` : undefined,
                          textAlign: cell.id === "pl_page" ? "right" : undefined,
                        }}
                      >
                        {content}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        );
      })}
    </article>
  );
}

function PackingListIccPrintViewWithTemplate({ output, documentId, isFinal, templateLayout }: Props) {
  const template = useMemo(() => {
    const fromPayload = parseIccTemplate(templateLayout);
    if (fromPayload) {
      return fromPayload;
    }
    return readPackingListTemplateFromStorage();
  }, [templateLayout]);

  if (template) {
    return (
      <PackingListIccTemplatePrintView output={output} documentId={documentId} isFinal={isFinal} template={template} />
    );
  }
  return <PackingListIccPrintView output={output} documentId={documentId} isFinal={isFinal} />;
}

function ShippingInstructionsPrintViewWithTemplate({ output, documentId, isFinal, templateLayout }: Props) {
  const template = useMemo(() => {
    const fromPayload = parseIccTemplate(templateLayout);
    if (fromPayload) {
      return fromPayload;
    }
    return readTemplateFromStorage(SHIPPING_INSTRUCTIONS_TEMPLATE_STORAGE_KEY);
  }, [templateLayout]);

  if (!template) {
    return <SiPrintView output={output} documentId={documentId} />;
  }

  return (
    <GenericTemplatePrintView
      rows={flattenRows(output)}
      documentId={documentId}
      template={template}
      isFinal={isFinal}
      cellValueFor={shippingCellValue}
    />
  );
}

function CertificateOfQualityPrintViewWithTemplate({ output, documentId, isFinal, templateLayout }: Props) {
  const template = useMemo(() => {
    const fromPayload = parseIccTemplate(templateLayout);
    if (fromPayload) {
      return fromPayload;
    }
    return readTemplateFromStorage(QUALITY_CERT_TEMPLATE_STORAGE_KEY);
  }, [templateLayout]);

  if (!template) {
    return <CertificateOfQualityPrintView output={output} documentId={documentId} />;
  }

  return (
    <GenericTemplatePrintView
      rows={flattenRows(output)}
      documentId={documentId}
      template={template}
      isFinal={isFinal}
      cellValueFor={qualityCellValue}
      tableSectionConfig={{
        container_table: { columnIds: QC_CONTAINER_COLUMN_IDS, rowPlaceholderId: "qc_ct_row" },
      }}
    />
  );
}

function CertificateOfWeightPrintViewWithTemplate({ output, documentId, isFinal, templateLayout }: Props) {
  const template = useMemo(() => {
    const fromPayload = parseIccTemplate(templateLayout);
    if (fromPayload) {
      return fromPayload;
    }
    return readTemplateFromStorage(WEIGHT_CERT_TEMPLATE_STORAGE_KEY);
  }, [templateLayout]);

  if (!template) {
    return <CertificateOfWeightPrintView output={output} documentId={documentId} />;
  }

  return (
    <GenericTemplatePrintView
      rows={flattenRows(output)}
      documentId={documentId}
      template={template}
      isFinal={isFinal}
      cellValueFor={weightCellValue}
      tableSectionConfig={{
        container_table: { columnIds: WC_CONTAINER_COLUMN_IDS, rowPlaceholderId: "wc_ct_row" },
      }}
    />
  );
}

function WayBillPrintViewWithTemplate({ output, documentId, isFinal, templateLayout }: Props) {
  const template = useMemo(() => {
    const fromPayload = parseIccTemplate(templateLayout);
    if (fromPayload) {
      return fromPayload;
    }
    return readTemplateFromStorage(WAY_BILL_TEMPLATE_STORAGE_KEY);
  }, [templateLayout]);

  if (!template) {
    return <WayBillPrintView output={output} documentId={documentId} />;
  }

  const driverTabs = output.sections
    .filter((section) => section.heading.startsWith("Driver "))
    .map((section, index) => ({
      key: `${section.heading}-${index + 1}`,
      rows: section.rows,
    }));
  const activeRows = driverTabs[0]?.rows ?? flattenRows(output);

  return (
    <GenericTemplatePrintView
      rows={activeRows}
      documentId={documentId}
      template={template}
      isFinal={isFinal}
      cellValueFor={wayBillCellValue}
    />
  );
}

function IcoCertificatePrintViewWithTemplate({ output, documentId, isFinal, templateLayout }: Props) {
  const template = useMemo(() => {
    const fromPayload = parseIccTemplate(templateLayout);
    if (fromPayload) {
      return fromPayload;
    }
    return readTemplateFromStorage(ICO_CERT_TEMPLATE_STORAGE_KEY);
  }, [templateLayout]);

  if (!template) {
    return <IcoCertificatePrintView output={output} documentId={documentId} />;
  }

  return (
    <GenericTemplatePrintView
      rows={flattenRows(output)}
      documentId={documentId}
      template={template}
      isFinal={isFinal}
      cellValueFor={icoCellValue}
    />
  );
}

function BillOfLadingRiderPages({ output }: { output: DocumentOutputSnapshot }) {
  const grouped = output.sections
    .filter((section) => section.heading.startsWith("BL Rider "))
    .map((section) => Object.fromEntries(section.rows.map((row) => [row.label, row.value])));

  if (grouped.length === 0) {
    return null;
  }

  return (
    <>
      {grouped.map((page, index) => (
        <article key={`bl-rider-${index + 1}`} className="print-sheet bl-rider-sheet page-break-before">
          <table className="print-table icc-table">
            <tbody>
              <tr>
                <td colSpan={3}><strong>MEDITERRANEAN SHIPPING COMPANY S.A.</strong><br />SCAC Code: MSCU</td>
                <td colSpan={2} className="table-align-right">
                  <strong>BILL OF LADING No.</strong><br />
                  {display(page["Bill of Lading No"])}<br />
                  {display(page["Rider Page Label"])}
                </td>
              </tr>
              <tr>
                <td colSpan={5}><strong>PARTICULARS FURNISHED BY THE SHIPPER – NOT CHECKED BY CARRIER – CARRIER NOT RESPONSIBLE (see Clause 14)</strong></td>
              </tr>
              <tr>
                <th className="bl-column-heading">Container Numbers, Seal Numbers and Marks</th>
                <th colSpan={2} className="bl-column-heading">Description of Packages and Goods<br /><span className="bl-clause-note">(Continued on attached Bill of Lading Rider page(s), if applicable)</span></th>
                <th className="bl-column-heading">Gross Cargo Weight</th>
                <th className="bl-column-heading">Measurement</th>
              </tr>
              <tr>
                <td>&nbsp;</td>
                <td colSpan={2} className="preserve-linebreaks">{display(page["Rider Description"])}</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
              </tr>
              <tr>
                <td colSpan={2}><span className="bl-label-lite">PLACE AND DATE OF ISSUE</span><br /><span className="bl-field-value bl-field-value-spaced">{display(page["Place and Date of Issue"])}</span></td>
                <td><span className="bl-label-lite">SHIPPED ON BOARD DATE</span><br /><span className="bl-field-value bl-field-value-spaced">{display(page["Shipped on Board Date"])}</span></td>
                <td colSpan={2}><span className="bl-label-lite">SIGNED on behalf of the Carrier MSC Mediterranean Shipping Company S.A.</span></td>
              </tr>
            </tbody>
          </table>
        </article>
      ))}
    </>
  );
}

function BillOfLadingPrintView({ output, documentId }: Props) {
  const rows = flattenRows(output);
  const billTypeLabel = display(value(rows, "Bill Type")) || "ORIGINAL BILL No.";
  const referenceType = display(value(rows, "Reference Type")) || "Shipper Ref.";

  return (
    <>
      <article className="print-sheet bl-sheet">
        <table className="print-table bl-table">
          <colgroup>
            <col style={{ width: "20%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "4%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "2%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "6%" }} />
            <col style={{ width: "11%" }} />
            <col style={{ width: "11%" }} />
          </colgroup>
          <tbody>
            <tr>
              <td colSpan={4} rowSpan={2} className="bl-header-cell">
                <strong>MEDITERRANEAN SHIPPING COMPANY S.A.</strong>
                <br />
                <span className="bl-subhead">SCAC Code: MSCU</span>
              </td>
              <td colSpan={6} className="bl-empty-cell bl-bill-type-cell">{billTypeLabel}</td>
            </tr>
            <tr>
              <td colSpan={3} className="bl-meta-cell">
                <div className="bl-meta-grid">
                  <div>
                    <div className="bl-meta-label">NO. ORIGINAL BILL</div>
                    <div className="bl-meta-values">{display(value(rows, "Bill No"))}</div>
                  </div>
                  <div>
                    <div className="bl-meta-label">NO. COPY BILLS</div>
                    <div className="bl-meta-values">{display(value(rows, "No. Copy Bills"))}</div>
                  </div>
                </div>
              </td>
              <td colSpan={3} className="bl-meta-cell">
                <div className="bl-meta-label">NO. OF RIDER PAGES</div>
                <div className="bl-meta-values">{display(value(rows, "No. Rider Pages"))}</div>
              </td>
            </tr>
            <tr>
              <td colSpan={4} className="preserve-linebreaks">
                <span className="bl-label-lite">SHIPPER:</span>
                <br />
                <span className="bl-field-value bl-field-value-spaced">{display(value(rows, "Shipper"))}</span>
              </td>
              <td colSpan={6} rowSpan={3} className="preserve-linebreaks">
                <span className="bl-label-lite">CARRIER&apos;S AGENTS ENDORSEMENTS: </span>
                <span className="bl-clause-text">(Include Agent(s) at POD)</span>
                <br />
                <span className="bl-field-value bl-field-value-spaced">{display(value(rows, "Carrier Agents Endorsements"))}</span>
                {display(value(rows, "Notify 2")) ? (
                  <>
                    <br />
                    <span className="bl-label-lite">NOTIFY-II</span>
                    <br />
                    <span className="bl-field-value bl-field-value-spaced">{display(value(rows, "Notify 2"))}</span>
                  </>
                ) : null}
                {display(value(rows, "Notify 3")) ? (
                  <>
                    <br />
                    <span className="bl-label-lite">NOTIFY 3:</span>
                    <br />
                    <span className="bl-field-value bl-field-value-spaced">{display(value(rows, "Notify 3"))}</span>
                  </>
                ) : null}
              </td>
            </tr>
            <tr>
              <td colSpan={4} className="preserve-linebreaks">
                <span className="bl-label-lite">CONSIGNEE:</span> <span className="bl-clause-text">This B/L is not negotiable unless marked “To Order” or “To Order of…” here.</span>
                <br />
                <span className="bl-field-value bl-field-value-spaced">{display(value(rows, "Consignee"))}</span>
              </td>
            </tr>
            <tr>
              <td colSpan={4} className="preserve-linebreaks">
                <span className="bl-label-lite">NOTIFY PARTIES:</span> <span className="bl-clause-text">(No responsibility shall attach to the Carrier or to his Agent for failure to notify – see Clause 20)</span>
                <br />
                <span className="bl-field-value bl-field-value-spaced">{display(value(rows, "Notify Parties"))}</span>
              </td>
            </tr>
            <tr>
              <td colSpan={3}><span className="bl-label-lite">VESSEL &amp; VOYAGE NO. </span><span className="bl-clause-text">(see Clauses 8 &amp; 9)</span></td>
              <td colSpan={3}><span className="bl-label-lite">PORT OF LOADING</span></td>
              <td colSpan={4}><span className="bl-label-lite">PLACE OF RECEIPT: </span><span className="bl-clause-text">(Combined Transport ONLY – see Clauses 1 &amp; 5.2)</span></td>
            </tr>
            <tr>
              <td colSpan={3}><span className="bl-label-lite">{referenceType}</span><br /><span className="bl-field-value bl-field-value-spaced">{display(value(rows, "Reference Value"))}</span></td>
              <td colSpan={3}><span className="bl-label-lite">PORT OF DISCHARGE </span><br /><span className="bl-field-value bl-field-value-spaced">{display(value(rows, "Port of Discharge"))}</span></td>
              <td colSpan={4}><span className="bl-label-lite">PLACE OF DELIVERY: </span><span className="bl-clause-text">(Combined Transport ONLY – see Clauses 1 &amp; 5.2)</span><br /><span className="bl-field-value bl-field-value-spaced">{display(value(rows, "Place of Delivery"))}</span></td>
            </tr>
            <tr>
              <td colSpan={10} className="bl-banner-cell"><strong>PARTICULARS FURNISHED BY THE SHIPPER – NOT CHECKED BY CARRIER – CARRIER NOT RESPONSIBLE (see Clause 14)</strong></td>
            </tr>
            <tr>
              <th colSpan={1} className="bl-column-heading">Container Numbers, Seal Numbers and Marks</th>
              <th colSpan={7} className="bl-column-heading">Description of Packages and Goods<br /><span className="bl-clause-note">(Continued on attached Bill of Lading Rider page(s), if applicable)</span></th>
              <th colSpan={1} className="bl-column-heading">Gross Cargo Weight</th>
              <th colSpan={1} className="bl-column-heading">Measurement</th>
            </tr>
            <tr>
              <td colSpan={1} className="preserve-linebreaks bl-cargo-marks">{display(value(rows, "Container Numbers, Seal Numbers and Marks"))}</td>
              <td colSpan={7} className="preserve-linebreaks bl-cargo-description">{display(value(rows, "Description of Packages and Goods"))}</td>
              <td colSpan={1} className="bl-number-cell">{display(value(rows, "Gross Cargo Weight"))}</td>
              <td colSpan={1} className="bl-number-cell">{display(value(rows, "Measurement"))}</td>
            </tr>
            <tr>
              <td colSpan={5} className="preserve-linebreaks bl-freight-block">
                <div className="bl-freight-intro-cell"><span className="bl-label-lite">FREIGHT &amp; CHARGES</span> <span className="bl-clause-text">Cargo shall not be delivered unless Freight &amp; Charges are paid (see Clause 16)</span></div>
                <div className="bl-followup-cell">{display(value(rows, "Freight & Charges"))}</div>
              </td>
              <td colSpan={5} className="preserve-linebreaks bl-legal-cell">{display(value(rows, "Legal Text"))}</td>
            </tr>
            <tr>
              <td colSpan={2}><span className="bl-label-lite">DECLARED VALUE</span> <span className="bl-clause-text">(only applicable if Ad Valorem charges paid – see Clause 7.3)</span><br /><span className="bl-field-value bl-field-value-spaced">{display(value(rows, "Declared Value"))}</span></td>
              <td colSpan={3}><span className="bl-label-lite">CARRIER&apos;S RECEIPT</span> <span className="bl-clause-text">(No. of Cntrs or Pkgs rcvd by Carrier – see Clause 14.1)</span><br /><span className="bl-field-value bl-field-value-spaced">{display(value(rows, "Carrier Receipt"))}</span></td>
              <td colSpan={5} rowSpan={2}><span className="bl-label-lite">SIGNED on behalf of the Carrier MSC Mediterranean Shipping Company S.A.</span></td>
            </tr>
            <tr>
              <td colSpan={2}><span className="bl-label-lite">PLACE AND DATE OF ISSUE</span><br /><span className="bl-field-value bl-field-value-spaced">{display(value(rows, "Place and Date of Issue"))}</span></td>
              <td colSpan={3}><span className="bl-label-lite">SHIPPED ON BOARD DATE</span><br /><span className="bl-field-value bl-field-value-spaced">{display(value(rows, "Shipped on Board Date"))}</span></td>
            </tr>
          </tbody>
        </table>

        <p className="permit-doc-id">Document ID: {documentId}</p>
      </article>
      <BillOfLadingRiderPages output={output} />
    </>
  );
}

function BillOfLadingPrintViewWithTemplate({ output, documentId, isFinal, templateLayout }: Props) {
  void isFinal;
  void templateLayout;
  return <BillOfLadingPrintView output={output} documentId={documentId} />;
}

function PackingListIccPrintView({ output, documentId, isFinal }: Props) {
  const rows = flattenRows(output);
  const containers = indexedValues(rows, "Container No ");
  const seals = indexedValues(rows, "Seal No ");
  const packages = indexedValues(rows, "No. of Packages ");
  const netWeights = indexedValues(rows, "Net Weight in KGS ");
  const grossWeights = indexedValues(rows, "Gross Weight in KGS ");
  const lineIndexes = Array.from(new Set([
    ...containers.keys(),
    ...seals.keys(),
    ...packages.keys(),
    ...netWeights.keys(),
    ...grossWeights.keys(),
  ])).sort((a, b) => a - b);

  return (
    <article className="print-sheet packing-icc-sheet">
      <table className="print-table packing-icc-table">
        <tbody>
          <tr>
            <td colSpan={5}><strong>PACKING LIST</strong></td>
            <td colSpan={5} className="table-align-right"><strong>PAGE 1 OF 1 | {isFinal ? "FINAL" : "ORIGINAL"}</strong></td>
          </tr>
          <tr>
            <td colSpan={5}><strong>Date:</strong> {display(value(rows, "Date"))}</td>
            <td colSpan={5}><strong>Sales Contract Ref:</strong> {display(value(rows, "Sales Contract Ref"))}</td>
          </tr>
          <tr>
            <td colSpan={5}><strong>Ref No:</strong> {display(value(rows, "Ref No"))}</td>
            <td colSpan={5}><strong>Sales Contract Date:</strong> {display(value(rows, "Sales Contract Date"))}</td>
          </tr>
          <tr>
            <td colSpan={5}><strong>Exporter/Beneficiary/Seller</strong><br />{display(value(rows, "Exporter/Beneficiary/Seller"))}</td>
            <td colSpan={5}><strong>Bank Permit Number:</strong> {display(value(rows, "Bank Permit Number"))}</td>
          </tr>
          <tr>
            <td colSpan={5}><strong>Applicant/Notify</strong><br />{display(value(rows, "Applicant/Notify"))}</td>
            <td colSpan={5}><strong>Bill of Lading Number:</strong> {display(value(rows, "Bill of Lading Number"))}</td>
          </tr>
          <tr>
            <td colSpan={5}><strong>Consignee</strong><br />{display(value(rows, "Consignee"))}</td>
            <td colSpan={5}><strong>Shipped on Board Date:</strong> {display(value(rows, "Shipped on Board Date"))}</td>
          </tr>
          <tr>
            <td colSpan={3}><strong>Shipping Line:</strong> {display(value(rows, "Shipping Line"))}</td>
            <td colSpan={2}><strong>Vessel:</strong> {display(value(rows, "Vessel Name"))}</td>
            <td colSpan={3}><strong>Voyage No:</strong> {display(value(rows, "Voyage No"))}</td>
            <td colSpan={2}><strong>ECCSA - Certificate of Origin Number:</strong> {display(value(rows, "ECCSA Certificate of Origin Number"))}</td>
          </tr>
        </tbody>
      </table>

      <table className="print-table packing-icc-table mt-sm">
        <tbody>
          <tr>
            <td colSpan={5}><strong>DESCRIPTION OF GOODS:</strong> {display(value(rows, "Description of Goods"))}</td>
          </tr>
          <tr>
            <td colSpan={5}><strong>HS CODE:</strong> {display(value(rows, "HS Code"))}</td>
          </tr>
        </tbody>
      </table>

      <table className="print-table packing-icc-table mt-sm">
        <thead>
          <tr>
            <th>CONTAINER NUMBER</th>
            <th>SEAL NUMBER</th>
            <th>NO. OF PACKAGES</th>
            <th>NET WEIGHT IN KGS</th>
            <th>GROSS WEIGHT IN KGS</th>
          </tr>
        </thead>
        <tbody>
          {lineIndexes.length > 0 ? (
            lineIndexes.map((index) => (
              <tr key={`packing-icc-line-${index}`}>
                <td>{display(containers.get(index))}</td>
                <td>{display(seals.get(index))}</td>
                <td>{display(packages.get(index))}</td>
                <td>{display(netWeights.get(index))}</td>
                <td>{display(grossWeights.get(index))}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={5}>No prepared containers in staffing yet.</td>
            </tr>
          )}
          <tr>
            <td colSpan={2}><strong>Grand Total:</strong></td>
            <td><strong>{display(value(rows, "Grand Total Packages"))}</strong></td>
            <td><strong>{display(value(rows, "Grand Total Net Weight KGS"))}</strong></td>
            <td><strong>{display(value(rows, "Grand Total Gross Weight KGS"))}</strong></td>
          </tr>
        </tbody>
      </table>

      <table className="print-table packing-icc-table mt-sm">
        <tbody>
          <tr>
            <td><strong>Country of Origin:</strong> {display(value(rows, "Country of Origin"))}</td>
            <td><strong>Place of Issue:</strong> {display(value(rows, "Place of Issue"))}</td>
          </tr>
          <tr>
            <td><strong>Port of Loading:</strong> {display(value(rows, "Port of Loading"))}</td>
            <td><strong>Date of Issue:</strong> {display(value(rows, "Date of Issue"))}</td>
          </tr>
          <tr>
            <td><strong>Port of Discharge:</strong> {display(value(rows, "Port of Discharge"))}</td>
            <td><strong>Signatory Company:</strong> {display(value(rows, "Signatory Company"))}</td>
          </tr>
          <tr>
            <td><strong>Final Destination:</strong> {display(value(rows, "Final Destination"))}</td>
            <td><strong>Authorized Signatory Name:</strong> {display(value(rows, "Authorized Signatory Name"))}</td>
          </tr>
          <tr>
            <td><strong>Delivery/Trade Term:</strong> {display(value(rows, "Delivery/Trade Term"))}</td>
            <td rowSpan={3} className="packing-icc-declaration-cell">{display(value(rows, "Declaration"))}</td>
          </tr>
          <tr>
            <td><strong>Type of Shipment:</strong> {display(value(rows, "Type of Shipment"))}</td>
          </tr>
          <tr>
            <td><strong>Incoterm:</strong> {display(value(rows, "Incoterm"))}</td>
          </tr>
          <tr>
            <td><strong>Term/Method of Payment:</strong> {display(value(rows, "Term/Method of Payment"))}</td>
            <td><strong>Total Net Weight (MT):</strong> {display(value(rows, "Total Net Weight (MT)"))}</td>
          </tr>
          <tr>
            <td className="preserve-linebreaks"><strong>Packaging &amp; Marking (Label):</strong> {display(value(rows, "Packaging & Marking (Label)"))}</td>
            <td><strong>Total Gross Weight (MT):</strong> {display(value(rows, "Total Gross Weight (MT)"))}</td>
          </tr>
          <tr>
            <td><strong>Packing Date:</strong> {display(value(rows, "Packing Date"))}</td>
            <td><strong>Packing Place:</strong> {display(value(rows, "Packing Place"))}</td>
          </tr>
          <tr>
            <td colSpan={2}><strong>Address:</strong> {display(value(rows, "Address"))}</td>
          </tr>
        </tbody>
      </table>

      <table className="print-table packing-icc-table mt-sm packing-icc-footer-table">
        <tbody>
          <tr className="packing-icc-full-marking-row">
            <td className="packing-icc-marking-cell preserve-linebreaks"><strong>FULL MARKING:</strong><br />{display(value(rows, "Full Marking"))}</td>
            <td className="packing-icc-signature-cell"><strong>Authorized Signature &amp; Company Seal/Stamp</strong></td>
          </tr>
        </tbody>
      </table>

      <p className="permit-doc-id">Document ID: {documentId}</p>
    </article>
  );
}

function PermitPackingListPrintView({ output, documentId }: Props) {
  const rows = flattenRows(output);
  const shipper = value(rows, "Shipper");
  const notify = value(rows, "Notify");
  const contractRef = value(rows, "Contract Ref");
  const contractDate = value(rows, "Contract Date");
  const paymentTerm = value(rows, "Payment Term");
  const lcNumber = value(rows, "LC Number");
  const deliveryTerm = value(rows, "Delivery Term");
  const portOfLoading = value(rows, "Port of Loading");
  const portOfDischarge = value(rows, "Port of Discharge");
  const finalDestination = value(rows, "Final Destination");
  const hsCode = value(rows, "HS Code");
  const packagingMarking = value(rows, "Packaging & Marking");
  const description = value(rows, "Description");
  const netWeightKg = value(rows, "Net Weight (KG)");
  const grossWeightKg = value(rows, "Gross Weight (KG)");
  const noOfBags = value(rows, "No of Bags");
  const fullMarking = value(rows, "Full Marking");

  return (
    <article className="print-sheet permit-packing-sheet">
      <div className="permit-sheet-top-meta">
        <p>DATE:</p>
        <p>REF. NO.</p>
      </div>

      <header className="permit-invoice-title">
        <h1>PACKING LIST CERTIFICATE</h1>
      </header>

      <table className="print-table permit-invoice-table">
        <tbody>
          <tr>
            <th>SHIPPER</th>
            <td colSpan={6}>{shipper}</td>
          </tr>
          <tr>
            <th>NOTIFY</th>
            <td colSpan={6}>{notify}</td>
          </tr>
          <tr>
            <th>REFERENCE</th>
            <th>SALES CONTRACT REF. NO</th>
            <td>{contractRef}</td>
            <th>DATED</th>
            <td colSpan={3}>{contractDate}</td>
          </tr>
          <tr>
            <th>IF TERM OF PAYMENT</th>
            <td colSpan={6}>{paymentTerm}</td>
          </tr>
          <tr>
            <th>L.C NO</th>
            <td colSpan={6}>{lcNumber}</td>
          </tr>
          <tr>
            <th>DELIVERY TERM</th>
            <td>{deliveryTerm}</td>
            <th>PORT OF LOADING</th>
            <td colSpan={4}>{portOfLoading}</td>
          </tr>
          <tr>
            <th>PORT OF DISCHARGE</th>
            <td>{portOfDischarge}</td>
            <th>FINAL DESTINATION</th>
            <td colSpan={4}>{finalDestination}</td>
          </tr>
          <tr>
            <th>HS CODE</th>
            <td colSpan={6}>{hsCode}</td>
          </tr>
          <tr>
            <th>PACKAGING &amp; MARKING</th>
            <td colSpan={6} className="preserve-linebreaks">{packagingMarking}</td>
          </tr>
          <tr>
            <th rowSpan={3}>DESCRIPTION OF GOODS</th>
            <th colSpan={2}>QUANTITY IN KG</th>
            <th colSpan={4}>PACKAGES IN BAGS</th>
          </tr>
          <tr>
            <th>NET</th>
            <th>GROSS</th>
            <th colSpan={4} rowSpan={2}>{noOfBags}</th>
          </tr>
          <tr>
            <td className="permit-goods-cell">{description}</td>
            <td>{netWeightKg}</td>
            <td>{grossWeightKg}</td>
          </tr>
        </tbody>
      </table>

      <section className="permit-full-marking">
        <strong>FULL MARKING:</strong>
        <pre>{fullMarking}</pre>
      </section>

      <p className="permit-doc-id">Document ID: {documentId}</p>
    </article>
  );
}

function SiPrintView({ output, documentId }: Props) {
  const rows = flattenRows(output);
  const pick = (...labels: string[]): string => {
    for (const label of labels) {
      const resolved = value(rows, label);
      if (resolved !== "-") {
        return resolved;
      }
    }

    return "-";
  };

  const containers = indexedValues(rows, "Container No ");
  const seals = indexedValues(rows, "Seal No ");
  const certs = indexedValues(rows, "Cert No ");
  const fallbackContainers = indexedValues(rows, "Container ");
  const fallbackSeals = indexedValues(rows, "Seal ");
  const fallbackCerts = indexedValues(rows, "Cert ");
  const containerRows = Array.from(new Set([
    ...containers.keys(),
    ...seals.keys(),
    ...certs.keys(),
    ...fallbackContainers.keys(),
    ...fallbackSeals.keys(),
    ...fallbackCerts.keys(),
  ]))
    .sort((a, b) => a - b)
    .map((index) => ({
      index,
      container: display(containers.get(index) ?? fallbackContainers.get(index)),
      seal: display(seals.get(index) ?? fallbackSeals.get(index)),
      cert: display(certs.get(index) ?? fallbackCerts.get(index)),
    }))
    .filter((row) => row.container !== "" || row.seal !== "" || row.cert !== "");

  return (
    <article className="print-sheet si-sheet">
      <table className="print-table si-table">
        <colgroup>
          <col span={2} style={{ width: "12%" }} />
          <col style={{ width: "10.6667%" }} />
          <col style={{ width: "10.6667%" }} />
          <col style={{ width: "10.6667%" }} />
          <col style={{ width: "10.6667%" }} />
          <col style={{ width: "10.6667%" }} />
          <col style={{ width: "10.6667%" }} />
          <col span={2} style={{ width: "18%" }} />
        </colgroup>
        <tbody>
          <tr>
            <td colSpan={6}><strong>SHIPPING INSTRUCTION</strong></td>
            <td colSpan={4} className="table-align-right"><strong>PAGE 1 OF 1</strong></td>
          </tr>
          <tr>
            <td colSpan={5}><strong>Date:</strong> {display(pick("Date"))}</td>
            <td colSpan={5}><strong>Ref No:</strong> {display(pick("Ref No"))}</td>
          </tr>
          <tr>
            <td colSpan={2}><strong>Shipper</strong></td>
            <td colSpan={8} className="preserve-linebreaks">{display(pick("Shipper", "Shipper (E10)"))}</td>
          </tr>
          <tr>
            <td colSpan={2}><strong>Consignee</strong></td>
            <td colSpan={8} className="preserve-linebreaks">{display(pick("Consignee", "Consignee (E11)"))}</td>
          </tr>
          <tr>
            <td colSpan={2}><strong>Notify Party</strong></td>
            <td colSpan={8} className="preserve-linebreaks">{display(pick("Notify", "Notify (E12)"))}</td>
          </tr>
          <tr>
            <td colSpan={2}><strong>2nd Notify Party</strong></td>
            <td colSpan={8} className="preserve-linebreaks">{display(pick("Second Notify", "2nd Notify (E13)"))}</td>
          </tr>
          <tr>
            <td colSpan={2}><strong>Original Bill Type</strong></td>
            <td colSpan={2}>PREPAID</td>
            <td colSpan={2}>COLLECT</td>
            <td colSpan={4}>PREPAID FOR DOCUMENTATION</td>
          </tr>
          <tr>
            <td colSpan={2}><strong>Freight</strong></td>
            <td colSpan={8}>FREIGHT PAYABLE ELSEWHERE IN BASEL/SWITZERLAND BY WALTER MATTER</td>
          </tr>
          <tr>
            <td colSpan={2}><strong>Service Contract No</strong></td>
            <td colSpan={8}>{display(pick("Shipping Line / Service Contract (E17)", "Service Contract No"))}</td>
          </tr>
          <tr>
            <td colSpan={2}><strong>Cargo Description</strong></td>
            <td colSpan={8} className="preserve-linebreaks">{display(pick("Cargo Description", "Cargo Description (E18)", "Description"))}</td>
          </tr>
          <tr>
            <td colSpan={2}><strong>HS Code</strong></td>
            <td colSpan={3}>{display(pick("HS Code", "HS Code (E19)"))}</td>
            <td colSpan={2}><strong>Quantity</strong></td>
            <td colSpan={3}>{display(pick("Quantity", "Quantity (E20)"))}</td>
          </tr>
          <tr>
            <td colSpan={2}><strong>Gross Weight</strong></td>
            <td colSpan={3}>{display(pick("Gross Weight", "Gross Weight (KG)", "Gross Weight (H21)"))}</td>
            <td colSpan={2}><strong>Net Weight</strong></td>
            <td colSpan={3}>{display(pick("Net Weight", "Net Weight (KG)", "Net Weight (O21)"))}</td>
          </tr>
          <tr>
            <td colSpan={2}><strong>Verified Gross Mass</strong></td>
            <td colSpan={8}>SHOULD BE CONDUCTED.</td>
          </tr>
          <tr>
            <td colSpan={2}><strong>Cert Number</strong></td>
            <td colSpan={3}>{display(pick("Cert Number", "Cert Number (E23)", "Cert No"))}</td>
            <td colSpan={5}></td>
          </tr>
          <tr>
            <td colSpan={2}><strong>Partial Shipment Allowed Yes/No</strong></td>
            <td colSpan={8}>NOT ALLOWED</td>
          </tr>
          <tr>
            <td colSpan={2}><strong>If Reefer Cargo; indicate temperature settings</strong></td>
            <td colSpan={8}>---------</td>
          </tr>
          <tr>
            <td colSpan={2} rowSpan={2}><strong>Number Type and Size of Containers</strong></td>
            <td>20 DRY</td>
            <td>40 DRY</td>
            <td>40 DRHC</td>
            <td>20 REEF</td>
            <td>40 REF</td>
            <td colSpan={3}>OTHER</td>
          </tr>
          <tr>
            <td>{display(pick("Number Type and Size of Containers", "Number Type and Size of Containers (E27)"))}</td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td colSpan={3}></td>
          </tr>
          <tr>
            <td colSpan={2}><strong>Service Mode (CY/CY - CY/SD)</strong></td>
            <td colSpan={8}></td>
          </tr>
          <tr>
            <td colSpan={2}><strong>Port of Loading</strong></td>
            <td colSpan={8}>{display(pick("Port of Loading", "Port of Loading (E29)"))}</td>
          </tr>
          <tr>
            <td colSpan={2}><strong>Place of Discharge</strong></td>
            <td colSpan={8}>{display(pick("Place of Discharge", "Place of Discharge (E30)", "Destination"))}</td>
          </tr>
          <tr>
            <td colSpan={2}><strong>Booking Number</strong></td>
            <td colSpan={8}>{display(pick("Booking Number", "Booking Number (E31)"))}</td>
          </tr>
          <tr>
            <td colSpan={2}><strong>Vessel Departure (ETD) / Date</strong></td>
            <td colSpan={8}>{display(pick("Vessel Departure (ETD) / Date", "Vessel Departure (ETD) / Date (E32)"))}</td>
          </tr>
          <tr>
            <td colSpan={2}><strong>Additional Document / Remark</strong></td>
            <td colSpan={8} className="preserve-linebreaks">{display(pick("Additional Document / Remark", "Additional Document / Remark (E33)"))}</td>
          </tr>
          <tr>
            <td colSpan={2}><strong>Cargo Moved By</strong></td>
            <td colSpan={8}>{display(pick("Cargo Moved By", "Cargo Moved By (E34)"))}</td>
          </tr>
        </tbody>
      </table>

      <table className="print-table si-table mt-sm">
        <thead>
          <tr>
            <th>Container No</th>
            <th>Seal No</th>
            <th>Cert No</th>
          </tr>
        </thead>
        <tbody>
          {containerRows.length > 0 ? (
            containerRows.map((row) => (
              <tr key={`si-container-row-${row.index}`}>
                <td>{row.container || "-"}</td>
                <td>{row.seal || "-"}</td>
                <td>{row.cert || "-"}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={3}>No prepared containers in staffing yet.</td>
            </tr>
          )}
        </tbody>
      </table>

      <p className="permit-doc-id">Document ID: {documentId}</p>
    </article>
  );
}

function indexedValues(rows: Row[], prefix: string): Map<number, string> {
  const values = new Map<number, string>();

  for (const row of rows) {
    if (!row.label.startsWith(prefix)) {
      continue;
    }

    const match = row.label.match(/(\d+)$/);
    if (!match) {
      continue;
    }

    values.set(Number(match[1]), row.value);
  }

  return values;
}

function CertificateOfQualityPrintView({ output, documentId }: Props) {
  const rows = flattenRows(output);
  const containers = indexedValues(rows, "Container No ");
  const seals = indexedValues(rows, "Seal No ");
  const bags = indexedValues(rows, "Bags per Container ");
  const lineIndexes = Array.from(new Set([
    ...containers.keys(),
    ...seals.keys(),
    ...bags.keys(),
  ])).sort((a, b) => a - b);

  return (
    <article className="print-sheet quality-certificate-sheet">
      <header className="quality-certificate-header">
        <h1>CERTIFICATE OF QUALITY</h1>
        <div className="quality-certificate-meta">
          <p><strong>Date:</strong> {display(value(rows, "Date"))}</p>
          <p><strong>Ref No:</strong> {display(value(rows, "Ref No"))}</p>
        </div>
      </header>

      <p className="quality-certificate-statement">
        {display(value(rows, "Statement"))}
      </p>

      <table className="print-table quality-certificate-table">
        <tbody>
          <tr>
            <th>Mode of Transportation</th>
            <td>{display(value(rows, "Mode of Transportation"))}</td>
          </tr>
          <tr>
            <th>Moisture Content</th>
            <td>{display(value(rows, "Moisture Content"))}</td>
          </tr>
          <tr>
            <th>Shipper</th>
            <td>{display(value(rows, "Shipper"))}</td>
          </tr>
          <tr>
            <th>Notify</th>
            <td>{display(value(rows, "Notify"))}</td>
          </tr>
          <tr>
            <th>2nd Notify</th>
            <td>{display(value(rows, "Second Notify"))}</td>
          </tr>
          <tr>
            <th>Description of Goods</th>
            <td>{display(value(rows, "Description of Goods"))}</td>
          </tr>
          <tr>
            <th>Origin</th>
            <td>{display(value(rows, "Origin"))}</td>
          </tr>
          <tr>
            <th>Quality</th>
            <td>{display(value(rows, "Quality"))}</td>
          </tr>
          <tr>
            <th>ICO No</th>
            <td>{display(value(rows, "ICO No"))}</td>
          </tr>
          <tr>
            <th>Cert No</th>
            <td>{display(value(rows, "Cert No"))}</td>
          </tr>
          <tr>
            <th>Net Weight</th>
            <td>{display(value(rows, "Net Weight"))}</td>
          </tr>
          <tr>
            <th>Gross Weight</th>
            <td>{display(value(rows, "Gross Weight"))}</td>
          </tr>
          <tr>
            <th>Quantity in LB</th>
            <td>{display(value(rows, "Quantity in LB"))}</td>
          </tr>
          <tr>
            <th>From</th>
            <td>{display(value(rows, "From"))}</td>
          </tr>
          <tr>
            <th>To</th>
            <td>{display(value(rows, "To"))}</td>
          </tr>
        </tbody>
      </table>

      <table className="print-table quality-certificate-table mt-sm">
        <thead>
          <tr>
            <th>Container No</th>
            <th>Seal No</th>
            <th>Quantity of Bags per Container</th>
          </tr>
        </thead>
        <tbody>
          {lineIndexes.length > 0 ? (
            lineIndexes.map((index) => (
              <tr key={index}>
                <td>{display(containers.get(index))}</td>
                <td>{display(seals.get(index))}</td>
                <td>{display(bags.get(index))}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={3}>No prepared containers in staffing yet.</td>
            </tr>
          )}
        </tbody>
      </table>

      <p className="quality-certificate-signatory mt-sm">
        <strong>Signatory Company:</strong> {display(value(rows, "Signatory Company"))}
      </p>

      <p className="permit-doc-id">Document ID: {documentId}</p>
    </article>
  );
}

function CertificateOfWeightPrintView({ output, documentId }: Props) {
  const rows = flattenRows(output);
  const containers = indexedValues(rows, "Container No ");
  const seals = indexedValues(rows, "Seal No ");
  const bags = indexedValues(rows, "Bags per Container ");
  const bagWeightNet = indexedValues(rows, "Bag Weight Net ");
  const bagWeightGross = indexedValues(rows, "Bag Weight Gross ");
  const containerNetWeight = indexedValues(rows, "Container Net Weight ");
  const containerGrossWeight = indexedValues(rows, "Container Gross Weight ");
  const lineIndexes = Array.from(new Set([
    ...containers.keys(),
    ...seals.keys(),
    ...bags.keys(),
    ...bagWeightNet.keys(),
    ...bagWeightGross.keys(),
    ...containerNetWeight.keys(),
    ...containerGrossWeight.keys(),
  ])).sort((a, b) => a - b);

  return (
    <article className="print-sheet weight-certificate-sheet">
      <header className="weight-certificate-header">
        <h1>CERTIFICATE OF WEIGHT</h1>
        <div className="weight-certificate-meta">
          <p><strong>Date:</strong> {display(value(rows, "Date"))}</p>
          <p><strong>Ref No:</strong> {display(value(rows, "Ref No"))}</p>
        </div>
      </header>

      <table className="print-table weight-certificate-table">
        <tbody>
          <tr>
            <th>Shipper</th>
            <td>{display(value(rows, "Shipper"))}</td>
          </tr>
          <tr>
            <th>Notify</th>
            <td>{display(value(rows, "Notify"))}</td>
          </tr>
          <tr>
            <th>2nd Notify</th>
            <td>{display(value(rows, "Second Notify"))}</td>
          </tr>
          <tr>
            <th>Description of Goods</th>
            <td>{display(value(rows, "Description of Goods"))}</td>
          </tr>
          <tr>
            <th>Net Weight</th>
            <td>{display(value(rows, "Net Weight"))}</td>
          </tr>
          <tr>
            <th>Gross Weight</th>
            <td>{display(value(rows, "Gross Weight"))}</td>
          </tr>
          <tr>
            <th>Packages in Bags</th>
            <td>{display(value(rows, "Packages in Bags"))}</td>
          </tr>
          <tr>
            <th>Origin</th>
            <td>{display(value(rows, "Origin"))}</td>
          </tr>
          <tr>
            <th>Quality</th>
            <td>{display(value(rows, "Quality"))}</td>
          </tr>
          <tr>
            <th>ICO No</th>
            <td>{display(value(rows, "ICO No"))}</td>
          </tr>
          <tr>
            <th>Cert No</th>
            <td>{display(value(rows, "Cert No"))}</td>
          </tr>
          <tr>
            <th>From</th>
            <td>{display(value(rows, "From"))}</td>
          </tr>
          <tr>
            <th>To</th>
            <td>{display(value(rows, "To"))}</td>
          </tr>
        </tbody>
      </table>

      <table className="print-table weight-certificate-table mt-sm">
        <thead>
          <tr>
            <th>Container No</th>
            <th>Seal No</th>
            <th>Quantity of Bags Per Container</th>
            <th>Bag Weight (Net)</th>
            <th>Bag Weight (Gross)</th>
            <th>Container Net Weight (KGS)</th>
            <th>Container Gross Weight (KGS)</th>
          </tr>
        </thead>
        <tbody>
          {lineIndexes.length > 0 ? (
            lineIndexes.map((index) => (
              <tr key={index}>
                <td>{display(containers.get(index))}</td>
                <td>{display(seals.get(index))}</td>
                <td>{display(bags.get(index))}</td>
                <td>{display(bagWeightNet.get(index))}</td>
                <td>{display(bagWeightGross.get(index))}</td>
                <td>{display(containerNetWeight.get(index))}</td>
                <td>{display(containerGrossWeight.get(index))}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={7}>No prepared containers in staffing yet.</td>
            </tr>
          )}
          <tr>
            <td colSpan={5} className="table-align-right"><strong>TOTAL SUM</strong></td>
            <td><strong>{display(value(rows, "Total Net Weight"))}</strong></td>
            <td><strong>{display(value(rows, "Total Gross Weight"))}</strong></td>
          </tr>
        </tbody>
      </table>

      <p className="permit-doc-id">Document ID: {documentId}</p>
    </article>
  );
}

function WayBillPrintView({ output, documentId }: Props) {
  const driverTabs = useMemo(() => output.sections
    .filter((section) => section.heading.startsWith("Driver "))
    .map((section, index) => ({
      key: `${section.heading}-${index + 1}`,
      label: section.heading.replace(/^Driver\s+\d+\s+-\s+/, ""),
      rows: section.rows,
    })), [output.sections]);
  const [activeTab, setActiveTab] = useState(0);
  const activeRows = driverTabs[activeTab]?.rows ?? [];

  return (
    <article className="print-sheet way-bill-sheet">
      <div className="way-bill-tabs screen-only">
        {driverTabs.length > 0 ? (
          driverTabs.map((tab, index) => (
            <button
              key={tab.key}
              type="button"
              className={index === activeTab ? "" : "button-secondary"}
              onClick={() => setActiveTab(index)}
            >
              {tab.label}
            </button>
          ))
        ) : (
          <p>No staffing drivers found yet.</p>
        )}
      </div>

      {driverTabs.length === 0 ? (
        <section className="way-bill-page">
          <p>No Way Bill tabs to display yet. Add driver/truck data in Staffing and generate again.</p>
        </section>
      ) : (
        <section className="way-bill-page">
          <header className="way-bill-header">
            <h1>WAY BILL</h1>
            <div className="way-bill-meta">
              <p><strong>DATE:</strong> {display(value(activeRows, "Date"))}</p>
              <p><strong>REF. No:</strong> {display(value(activeRows, "Ref No"))}</p>
            </div>
          </header>

          <table className="print-table way-bill-table">
            <tbody>
              <tr>
                <th>To:</th>
                <td>{display(value(activeRows, "To"))}</td>
              </tr>
              <tr>
                <th></th>
                <td>{display(value(activeRows, "To Contact"))}</td>
              </tr>
              <tr>
                <th>Truck No:</th>
                <td>{display(value(activeRows, "Truck No"))}</td>
              </tr>
              <tr>
                <th>Trailer No:</th>
                <td>{display(value(activeRows, "Trailer No"))}</td>
              </tr>
              <tr>
                <th>Driver Name:</th>
                <td>{display(value(activeRows, "Driver Name"))}</td>
              </tr>
              <tr>
                <th>Driver Phone No:</th>
                <td>{display(value(activeRows, "Driver Phone No"))}</td>
              </tr>
              <tr>
                <th>License No:</th>
                <td>{display(value(activeRows, "License No"))}</td>
              </tr>
              <tr>
                <th>Final Destination:</th>
                <td>{display(value(activeRows, "Final Destination"))}</td>
              </tr>
            </tbody>
          </table>

          <section className="way-bill-declaration">
            <h3>Driver&apos;s Declaration</h3>
            <p>{display(value(activeRows, "Driver Declaration"))}</p>
          </section>

          <section className="way-bill-conditions">
            <p><strong>{display(value(activeRows, "Terms Intro"))}</strong></p>
            <p>{display(value(activeRows, "Condition 1"))}</p>
            <p>{display(value(activeRows, "Condition 2"))}</p>
            <p>{display(value(activeRows, "Condition 3"))}</p>
          </section>

          <table className="print-table way-bill-table mt-sm">
            <tbody>
              <tr>
                <th colSpan={2}>Detail of Goods</th>
              </tr>
              <tr>
                <th>Description</th>
                <td>{display(value(activeRows, "Detail of Goods"))}</td>
              </tr>
              <tr>
                <th>ICO No</th>
                <td>{display(value(activeRows, "ICO No"))}</td>
              </tr>
              <tr>
                <th>Cert No</th>
                <td>{display(value(activeRows, "Cert No"))}</td>
              </tr>
              <tr>
                <th>No of Bag</th>
                <td>{display(value(activeRows, "No of Bag"))}</td>
              </tr>
              <tr>
                <th>Gross Weight</th>
                <td>{display(value(activeRows, "Gross Weight"))}</td>
              </tr>
              <tr>
                <th>Net Weight</th>
                <td>{display(value(activeRows, "Net Weight"))}</td>
              </tr>
            </tbody>
          </table>

          <table className="print-table way-bill-table mt-sm">
            <tbody>
              <tr>
                <th>{display(value(activeRows, "Transport Charge Label"))}</th>
                <td>{display(value(activeRows, "Transport Charge Per Quantal"))}</td>
                <td>{display(value(activeRows, "Transport Charge Total"))}</td>
              </tr>
            </tbody>
          </table>

          <table className="print-table way-bill-table mt-sm">
            <thead>
              <tr>
                <th>Container No</th>
                <th>Seal No</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{display(value(activeRows, "Container No 1"))}</td>
                <td>{display(value(activeRows, "Seal No 1"))}</td>
              </tr>
              <tr>
                <td>{display(value(activeRows, "Container No 2"))}</td>
                <td>{display(value(activeRows, "Seal No 2"))}</td>
              </tr>
            </tbody>
          </table>

          <p className="way-bill-amharic">{display(value(activeRows, "Amharic Declaration"))}</p>

          <table className="print-table way-bill-table mt-sm">
            <tbody>
              <tr>
                <th>{display(value(activeRows, "Driver Name Label"))}</th>
                <td>{display(value(activeRows, "Driver Name"))}</td>
              </tr>
              <tr>
                <th>{display(value(activeRows, "Driver Signature Label"))}</th>
                <td>{display(value(activeRows, "Dispatch Signature Label"))}</td>
              </tr>
              <tr>
                <th>{display(value(activeRows, "Driver Date Label"))}</th>
                <td>{display(value(activeRows, "Stamp Date Label"))}</td>
              </tr>
            </tbody>
          </table>

          <p className="permit-doc-id">Document ID: {documentId}</p>
        </section>
      )}
    </article>
  );
}

function IcoCertificatePrintView({ output, documentId }: Props) {
  const rows = flattenRows(output);
  const field = (label: string) => display(value(rows, label));
  const checked = (label: string) => value(rows, label).trim().toLowerCase() === "yes";
  const checkMark = (label: string) => (checked(label) ? "x" : "");

  return (
    <article className="print-sheet ico-sheet">
      <section className="ico-part-a-wrap">
        <aside className="ico-original-strip" aria-hidden>
          <span>ORIGINAL</span>
        </aside>

        <section className="ico-form">
          <div className="ico-topline">
            <p>PART A: FOR USE BY AUTHORITIES OF ISSUING COUNTRY</p>
            <p>ICO CERTIFICATE OF ORIGIN</p>
          </div>

          <div className="ico-grid-row h30 two-col">
          <div className="cell with-code-boxes">
            <strong>1 Exporter/Consignor</strong>
              <p className="ico-wrap">{field("1 Exporter/Consignor")}</p>
              <div className="ico-code-boxes" aria-hidden>
                <span /><span /><span /><span />
              </div>
            </div>
            <div className="cell ico-org-block">
              <strong>Form approved by the:</strong>
              <div className="ico-org-logo" aria-hidden />
              <p className="ico-org-title">INTERNATIONAL COFFEE ORGANIZATION</p>
              <p className="ico-org-meta">22 Berners Street, London W1T 3DD, England</p>
              <p className="ico-org-meta">Tel: +44 (0) 20 7580 8591 &nbsp;&nbsp; Fax: +44 (0) 20 7580 6129</p>
              <p className="ico-org-meta">Email: certs@ico.org</p>
            </div>
          </div>

          <div className="ico-grid-row h30 two-col">
            <div className="cell with-code-boxes">
              <strong>2 Notify address</strong>
              <p className="ico-wrap">{field("2 Notify Address")}</p>
              <div className="ico-code-boxes" aria-hidden>
                <span /><span /><span /><span />
              </div>
            </div>
            <div className="cell right-stack">
            <div className="stack-row h10">
              <strong>3 Internal reference No.</strong>
              <p>{field("3 Internal Reference No")}</p>
            </div>
            <div className="stack-row h10 split-3-32-28-32">
              <div><strong>4 Country code</strong><p>{field("4 Country Code")}</p></div>
              <div><strong>Port code</strong><p>{field("4 Port Code")}</p></div>
              <div><strong>Serial No.</strong><p>{field("4 Serial No")}</p></div>
            </div>
            <div className="stack-row h10 with-code-boxes">
              <strong>5 Producing country</strong>
              <p>{field("5 Producing Country")}</p>
              <div className="ico-code-boxes" aria-hidden>
                <span /><span /><span /><span />
              </div>
            </div>
          </div>
        </div>

          <div className="ico-grid-row h15 two-col">
            <div className="cell with-code-boxes">
              <strong>6 Country of destination</strong>
              <p>{field("6 Country of Destination")}</p>
              <div className="ico-code-boxes" aria-hidden>
                <span /><span /><span /><span />
              </div>
            </div>
          <div className="cell">
            <strong>7 Date of export (DD/MM/YY)</strong>
            <p>{field("7 Date of Export (DD/MM/YY)")}</p>
          </div>
        </div>

          <div className="ico-grid-row h15 two-col">
            <div className="cell with-code-boxes">
              <strong>8 Country of trans-shipment</strong>
              <p className="ico-wrap">{field("8 Country of Trans-shipment")}</p>
              <div className="ico-code-boxes" aria-hidden>
                <span /><span /><span /><span />
              </div>
            </div>
            <div className="cell with-code-boxes">
              <strong>9 Name of carrier</strong>
              <p className="ico-wrap">{field("9 Name of Carrier")}</p>
              <div className="ico-code-boxes" aria-hidden>
                <span /><span /><span /><span />
              </div>
            </div>
        </div>

        <div className="ico-grid-row h35 two-col">
          <div className="cell">
            <strong>10 ICO Identification mark</strong>
            <p className="ico-marking-line">{field("10 ICO Identification Mark") || "- - - / - - - - / - - - -"}</p>
            <p>Other marks</p>
            <p className="ico-wrap">{field("10 Other Marks ICO No")}</p>
            <p className="ico-wrap">{field("10 Other Marks Cert No")}</p>
          </div>
          <div className="cell right-block">
            <div className="ico-box11">
              <strong>11&nbsp; Shipped in:</strong>
              <div className="ico-check-grid">
                <span><i className="chk">{checkMark("11 Shipped in - Bags")}</i> Bags</span>
                <span><i className="chk">{checkMark("11 Shipped in - Bulk")}</i> Bulk</span>
                <span><i className="chk">{checkMark("11 Shipped in - Containers")}</i> Containers</span>
                <span><i className="chk">{checkMark("11 Shipped in - Other")}</i> Other</span>
              </div>
            </div>
            <div className="ico-box12-13">
              <div className="box12">
                <strong>12&nbsp; Net weight of shipment</strong>
                <p>{field("12 Net Weight of Shipment")}</p>
              </div>
              <div className="box13">
                <strong>13&nbsp; Unit of weight</strong>
                <div className="ico-unit-row">
                  <span><i className="chk">{field("13 Unit of Weight").toLowerCase() === "kg" ? "x" : ""}</i> kg</span>
                  <span><i className="chk">{field("13 Unit of Weight").toLowerCase() === "lb" ? "x" : ""}</i> lb</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="ico-grid-row h15 full">
          <div className="cell">
            <strong>14 Description of coffee</strong>
            <div className="ico-check-row ico-check-row-spread">
              <span><i className="chk">{checkMark("14 Description - Green Arabica")}</i> Green Arabica</span>
              <span><i className="chk">{checkMark("14 Description - Green Robusta")}</i> Green Robusta</span>
              <span><i className="chk">{checkMark("14 Description - Roasted")}</i> Roasted</span>
              <span><i className="chk">{checkMark("14 Description - Soluble")}</i> Soluble</span>
            </div>
            <p className="ico-other-line"><i className="chk">{field("14 Description - Other (specify)") && field("14 Description - Other (specify)") !== "-" ? "x" : ""}</i> Other (specify) <span className="ico-wrap ico-other-text">{field("14 Description - Other (specify)")}</span></p>
          </div>
        </div>

        <div className="ico-grid-row h10 full">
          <div className="cell">
            <strong>15 Other relevant information</strong>
            <div className="ico-check-row ico-check-row-spread">
              <span>Processing method:</span>
              <span><i className="chk">{checkMark("15 Processing Method - Dry")}</i> Dry</span>
              <span><i className="chk">{checkMark("15 Processing Method - Wet")}</i> Wet</span>
              <span><i className="chk">{checkMark("15 Processing Method - Decaffeinated")}</i> Decaffeinated</span>
              <span><i className="chk">{checkMark("15 Processing Method - Organic")}</i> Organic</span>
            </div>
          </div>
        </div>

        <div className="ico-grid-row h10 full">
          <div className="cell">
            <strong>16</strong> {field("16 Certification Statement")}
          </div>
        </div>

        <div className="ico-grid-row h60 two-col">
          <div className="cell signature">
            <p className="sig-date">Date: {field("16 Issuing Officer Date")}</p>
            <p className="sig-place">Place: {field("16 Place")}</p>
            <p className="sig-caption">Signature of authorized Customs officer and Customs stamp of issuing country</p>
          </div>
          <div className="cell signature">
            <p className="sig-date">Date: {field("16 Certifying Officer Date")}</p>
            <p className="sig-place">Place: {field("16 Place")}</p>
            <p className="sig-caption">Signature of authorized Certifying officer and stamp of Certifying Agency</p>
          </div>
        </div>

        </section>
      </section>

      <section className="ico-part-b">
        <div className="ico-part-b-title">
          <p>PART B: RESERVED FOR 2-D BAR CODE STICKER</p>
        </div>
        <div className="ico-part-b-box">
          <p className="ico-part-b-no">17</p>
          <p className="ico-part-b-text">{field("17 Reserved")}</p>
        </div>
      </section>
      <p className="permit-doc-id">Document ID: {documentId}</p>
    </article>
  );
}

function DocumentPrintPageFrame(
  {
    children,
    input,
    docType,
  }: {
    children: ReactNode;
    input?: DocumentInputSnapshot;
    docType: DocumentType;
  },
) {
  const companyConfiguration = resolveCompanyConfiguration(input?.contract.orgId ?? "default", input?.companyConfiguration);
  const branding = companyConfiguration.documentBranding;
  const apply = branding.applyByDocType[docType];
  const showHeader = Boolean(apply.header && branding.header.imageDataUrl);
  const showFooter = Boolean(apply.footer && branding.footer.imageDataUrl);
  const headerHeightMm = showHeader ? Math.max(branding.header.heightMm, MIN_RENDERED_HEADER_HEIGHT_MM) : 0;
  const footerHeightMm = showFooter ? Math.max(branding.footer.heightMm, MIN_RENDERED_FOOTER_HEIGHT_MM) : 0;

  const style = {
    "--brand-header-height": `${headerHeightMm}mm`,
    "--brand-footer-height": `${footerHeightMm}mm`,
  } as CSSProperties;

  return (
    <article className="document-branded-page" style={style}>
      {showHeader ? (
        <div className="document-brand-slot document-brand-slot-top">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={branding.header.imageDataUrl}
            alt="Document header"
            style={{
              objectFit: branding.header.fit,
              objectPosition: `${branding.header.positionXPercent}% ${branding.header.positionYPercent}%`,
            }}
          />
        </div>
      ) : null}

      <div className="document-branded-content">
        {children}
      </div>

      {showFooter ? (
        <div className="document-brand-slot document-brand-slot-bottom">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={branding.footer.imageDataUrl}
            alt="Document footer"
            style={{
              objectFit: branding.footer.fit,
              objectPosition: `${branding.footer.positionXPercent}% ${branding.footer.positionYPercent}%`,
            }}
          />
        </div>
      ) : null}
    </article>
  );
}

export function DocumentPrintTemplate({
  output,
  documentId,
  input,
  isFinal = false,
  templateLayout,
}: Props) {
  let content: ReactNode;

  if (output.docType === "invoice") {
    content = <IccInvoicePrintView output={output} documentId={documentId} input={input} isFinal={isFinal} templateLayout={templateLayout} />;
  } else if (output.docType === "packing_list") {
    if (output.docVariant === "permit") {
      content = <PermitPackingListPrintView output={output} documentId={documentId} input={input} />;
    } else {
      content = <PackingListIccPrintViewWithTemplate output={output} documentId={documentId} input={input} isFinal={isFinal} templateLayout={templateLayout} />;
    }
  } else if (output.docType === "shipping_instructions") {
    content = <ShippingInstructionsPrintViewWithTemplate output={output} documentId={documentId} input={input} isFinal={isFinal} templateLayout={templateLayout} />;
  } else if (output.docType === "quality_certificate") {
    content = <CertificateOfQualityPrintViewWithTemplate output={output} documentId={documentId} input={input} isFinal={isFinal} templateLayout={templateLayout} />;
  } else if (output.docType === "weight_certificate") {
    content = <CertificateOfWeightPrintViewWithTemplate output={output} documentId={documentId} input={input} isFinal={isFinal} templateLayout={templateLayout} />;
  } else if (output.docType === "way_bill") {
    content = <WayBillPrintViewWithTemplate output={output} documentId={documentId} input={input} isFinal={isFinal} templateLayout={templateLayout} />;
  } else if (output.docType === "ico_certificate") {
    content = <IcoCertificatePrintViewWithTemplate output={output} documentId={documentId} input={input} isFinal={isFinal} templateLayout={templateLayout} />;
  } else if (output.docType === "bill_of_lading") {
    content = <BillOfLadingPrintViewWithTemplate output={output} documentId={documentId} input={input} isFinal={isFinal} templateLayout={templateLayout} />;
  } else {
    content = <SiPrintView output={output} documentId={documentId} input={input} />;
  }

  return (
    <DocumentPrintPageFrame input={input} docType={output.docType}>
      {content}
    </DocumentPrintPageFrame>
  );
}

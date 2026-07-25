"use client";

import { useMemo, useState } from "react";
import {
  isTemplateNoteCell,
  isTemplateRichContentCell,
  resolveTemplateCellStaticHtml,
} from "@/domain/template-static-content";
import { maxTemplateCellHeightStyle, templateCellBlockHeightStyle, templateCellHeightStyle, templateTableRowStyle } from "@/domain/template-print-metrics";
import {
  isWayBillStaticCell,
  resolveWayBillCellValue,
  resolveWayBillFooterValue,
  sortWayBillSections,
  WAY_BILL_FOOTER_ROW_ORDER,
  WAY_BILL_GOODS_ROW_ORDER,
  WAY_BILL_TRANSPORT_LABEL_IDS,
  WAY_BILL_TRANSPORT_ROW_ORDER,
  WAY_BILL_TRANSPORT_TH_LABELS,
} from "@/domain/way-bill-template";
import type { TemplateGridCell, TemplateSection } from "@/domain/template-layout";
import type { DocumentOutputSnapshot } from "@/types/models";

type Row = {
  label: string;
  value: string;
};

type PersistedIccTemplate = {
  sections: TemplateSection[];
};

function display(value: string | undefined | null): string {
  const normalized = value?.trim();
  return normalized && normalized !== "-" ? normalized : "-";
}

function isSpacerCell(cell: TemplateGridCell): boolean {
  return cell.label === "(spacer)" || cell.label === "(spacer no border)" || cell.id.includes("spacer");
}

function findCell(section: TemplateSection, cellId: string): TemplateGridCell | undefined {
  return section.cells?.find((cell) => cell.id === cellId);
}

function hasCell(section: TemplateSection, cellId: string): boolean {
  const cell = findCell(section, cellId);
  return Boolean(cell && !isSpacerCell(cell));
}

function sectionHasVisibleCells(section: TemplateSection): boolean {
  return (section.cells ?? []).some((cell) => {
    if (isSpacerCell(cell)) {
      return false;
    }

    if (isTemplateRichContentCell(cell)) {
      const html = resolveTemplateCellStaticHtml(cell);
      const stripped = html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();
      return stripped.length > 0;
    }

    return true;
  });
}

function buildStaticTokens(rows: Row[]): Record<string, string> {
  return {
    DRIVER_NAME: display(rows.find((row) => row.label === "Driver Name")?.value),
    SELLER_NAME: display(rows.find((row) => row.label === "Seller Name")?.value),
  };
}

function applyStaticTokens(html: string, tokens: Record<string, string>): string {
  return Object.entries(tokens).reduce(
    (result, [key, value]) => result.replaceAll(`{{${key}}}`, value),
    html,
  );
}

function renderStaticCell(cell: TemplateGridCell, rows: Row[]) {
  if (!isWayBillStaticCell(cell)) {
    return null;
  }

  const html = applyStaticTokens(resolveTemplateCellStaticHtml(cell), buildStaticTokens(rows));
  const stripped = html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();
  if (!stripped) {
    return null;
  }

  if (cell.id === "wb_decl_title") {
    return <h3>{stripped}</h3>;
  }

  if (cell.id === "wb_goods_hdr") {
    return <strong>{cell.label}</strong>;
  }

  if (isTemplateNoteCell(cell)) {
    return (
      <div
        className="template-static-html"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    <div
      className="template-static-html"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function fieldValue(rows: Row[], cell: TemplateGridCell): string {
  return display(resolveWayBillCellValue(rows, cell));
}

function renderWayBillFieldParagraph(cell: TemplateGridCell, rows: Row[], strong = false) {
  if (isWayBillStaticCell(cell)) {
    const rendered = renderStaticCell(cell, rows);
    if (rendered) {
      return (
        <div style={templateCellBlockHeightStyle(cell)}>
          {rendered}
        </div>
      );
    }
  }

  const value = fieldValue(rows, cell);
  if (strong) {
    return <p style={templateCellHeightStyle(cell)}><strong>{value}</strong></p>;
  }

  return <p style={templateCellHeightStyle(cell)}>{value}</p>;
}

function renderFooterLabel(cell: TemplateGridCell): string {
  const label = cell.label.trim();
  if (label) {
    return label.endsWith(":") ? label : `${label}:`;
  }

  if (isWayBillStaticCell(cell)) {
    const html = resolveTemplateCellStaticHtml(cell);
    const stripped = html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();
    if (stripped) {
      return stripped;
    }
  }

  return "-";
}

function renderFooterValueCell(cell: TemplateGridCell, rows: Row[]) {
  if (cell.id === "wb_footer_driver") {
    const value = display(resolveWayBillFooterValue(rows, cell));
    return value === "-" ? <span>&nbsp;</span> : value;
  }

  if (isWayBillStaticCell(cell)) {
    const rendered = renderStaticCell(cell, rows);
    return rendered ?? <span>&nbsp;</span>;
  }

  return <span>&nbsp;</span>;
}

function renderLabelCellText(cell: TemplateGridCell): string {
  if (isWayBillStaticCell(cell)) {
    const html = resolveTemplateCellStaticHtml(cell);
    const stripped = html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();
    if (stripped) {
      return stripped;
    }
  }

  return cell.label.trim();
}

function renderHeaderSection(section: TemplateSection, rows: Row[]) {
  if (!sectionHasVisibleCells(section)) {
    return null;
  }

  return (
    <header key={section.id} className="way-bill-header">
      {hasCell(section, "wb_title") ? (
        <h1>{fieldValue(rows, findCell(section, "wb_title")!)}</h1>
      ) : (
        <h1>WAY BILL</h1>
      )}
      <div className="way-bill-meta">
        {hasCell(section, "wb_date") ? (
          <p><strong>DATE:</strong> {fieldValue(rows, findCell(section, "wb_date")!)}</p>
        ) : null}
        {hasCell(section, "wb_ref") ? (
          <p><strong>REF. No:</strong> {fieldValue(rows, findCell(section, "wb_ref")!)}</p>
        ) : null}
      </div>
    </header>
  );
}

function renderTransportSection(section: TemplateSection, rows: Row[]) {
  const visibleRows = WAY_BILL_TRANSPORT_ROW_ORDER
    .filter((cellId) => hasCell(section, cellId))
    .map((cellId) => ({
      cellId,
      cell: findCell(section, cellId)!,
      labelCell: findCell(section, WAY_BILL_TRANSPORT_LABEL_IDS[cellId]),
    }));

  if (visibleRows.length === 0) {
    return null;
  }

  return (
    <table key={section.id} className="print-table way-bill-table">
      <tbody>
        {visibleRows.map(({ cellId, cell, labelCell }) => (
          <tr key={cellId} style={maxTemplateCellHeightStyle(cell, labelCell ?? cell)}>
            {cellId === "wb_to_contact" ? (
              <th style={templateCellHeightStyle(labelCell ?? cell)}></th>
            ) : (
              <th style={templateCellHeightStyle(labelCell ?? cell)}>
                {labelCell ? renderLabelCellText(labelCell) : `${WAY_BILL_TRANSPORT_TH_LABELS[cellId] ?? `${cell.label}:`}`}
              </th>
            )}
            <td style={templateCellHeightStyle(cell)}>{fieldValue(rows, cell)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function renderDeclarationSection(section: TemplateSection, rows: Row[]) {
  if (!sectionHasVisibleCells(section)) {
    return null;
  }

  return (
    <section key={section.id} className="way-bill-declaration">
      {hasCell(section, "wb_decl_title") ? (
        renderStaticCell(findCell(section, "wb_decl_title")!, rows) ?? <h3>Driver&apos;s Declaration</h3>
      ) : (
        <h3>Driver&apos;s Declaration</h3>
      )}
      {hasCell(section, "wb_driver_decl") ? (
        renderWayBillFieldParagraph(findCell(section, "wb_driver_decl")!, rows)
      ) : null}
    </section>
  );
}

function renderConditionsSection(section: TemplateSection, rows: Row[]) {
  const introCell = hasCell(section, "wb_terms_intro") ? findCell(section, "wb_terms_intro") : undefined;
  const conditionCells = ["wb_condition_1", "wb_condition_2", "wb_condition_3"]
    .filter((cellId) => hasCell(section, cellId))
    .map((cellId) => findCell(section, cellId)!);

  if (!introCell && conditionCells.length === 0) {
    return null;
  }

  return (
    <section key={section.id} className="way-bill-conditions">
      {introCell ? renderWayBillFieldParagraph(introCell, rows, true) : null}
      {conditionCells.map((cell) => (
        <div key={cell.id} style={templateCellBlockHeightStyle(cell)}>{renderWayBillFieldParagraph(cell, rows)}</div>
      ))}
    </section>
  );
}

function renderGoodsSection(section: TemplateSection, rows: Row[]) {
  const visibleRows = WAY_BILL_GOODS_ROW_ORDER.filter(({ cellId }) => hasCell(section, cellId));
  if (!hasCell(section, "wb_goods_hdr") && visibleRows.length === 0) {
    return null;
  }

  return (
    <table key={section.id} className="print-table way-bill-table mt-sm">
      <tbody>
        {hasCell(section, "wb_goods_hdr") ? (
          <tr>
            <th colSpan={2}>Detail of Goods</th>
          </tr>
        ) : null}
        {visibleRows.map(({ cellId, rowLabel }) => {
          const valueCell = findCell(section, cellId)!;
          const labelCell = findCell(section, `wb_lbl_${cellId.replace(/^wb_/, "")}`);
          return (
            <tr key={cellId} style={maxTemplateCellHeightStyle(valueCell, labelCell ?? valueCell)}>
              <th style={templateCellHeightStyle(labelCell ?? valueCell)}>{rowLabel}</th>
              <td style={templateCellHeightStyle(valueCell)}>{fieldValue(rows, valueCell)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function renderTransportChargeSection(section: TemplateSection, rows: Row[]) {
  const labelCell = hasCell(section, "wb_transport_label") ? findCell(section, "wb_transport_label") : undefined;
  const perQuantalCell = hasCell(section, "wb_transport_per_quantal")
    ? findCell(section, "wb_transport_per_quantal")
    : undefined;
  const totalCell = hasCell(section, "wb_transport_total") ? findCell(section, "wb_transport_total") : undefined;

  if (!labelCell && !perQuantalCell && !totalCell) {
    return null;
  }

  return (
    <table key={section.id} className="print-table way-bill-table mt-sm">
      <tbody>
        <tr style={maxTemplateCellHeightStyle(labelCell ?? { h: 1 }, perQuantalCell ?? { h: 1 }, totalCell ?? { h: 1 })}>
          <th style={templateCellHeightStyle(labelCell ?? { h: 1 })}>
            {labelCell
              ? (isWayBillStaticCell(labelCell)
                ? renderStaticCell(labelCell, rows)
                : fieldValue(rows, labelCell))
              : "-"}
          </th>
          <td style={templateCellHeightStyle(perQuantalCell ?? { h: 1 })}>{perQuantalCell ? fieldValue(rows, perQuantalCell) : "-"}</td>
          <td style={templateCellHeightStyle(totalCell ?? { h: 1 })}>{totalCell ? fieldValue(rows, totalCell) : "-"}</td>
        </tr>
      </tbody>
    </table>
  );
}

function renderContainersSection(section: TemplateSection, rows: Row[]) {
  const showHeader = hasCell(section, "wb_container_hdr_container") || hasCell(section, "wb_container_hdr_seal");
  const rowPairs = [
    { containerId: "wb_container_1", sealId: "wb_seal_1" },
    { containerId: "wb_container_2", sealId: "wb_seal_2" },
  ].filter((pair) => hasCell(section, pair.containerId) || hasCell(section, pair.sealId));

  if (!showHeader && rowPairs.length === 0) {
    return null;
  }

  return (
    <table key={section.id} className="print-table way-bill-table mt-sm">
      {showHeader ? (
        <thead>
          <tr>
            <th>{findCell(section, "wb_container_hdr_container")?.label ?? "Container No"}</th>
            <th>{findCell(section, "wb_container_hdr_seal")?.label ?? "Seal No"}</th>
          </tr>
        </thead>
      ) : null}
      <tbody>
        {rowPairs.map((pair) => {
          const containerCell = hasCell(section, pair.containerId) ? findCell(section, pair.containerId)! : undefined;
          const sealCell = hasCell(section, pair.sealId) ? findCell(section, pair.sealId)! : undefined;
          return (
          <tr key={pair.containerId} style={maxTemplateCellHeightStyle(containerCell ?? { h: 1 }, sealCell ?? { h: 1 })}>
            <td style={templateCellHeightStyle(containerCell ?? { h: 1 })}>
              {containerCell
                ? fieldValue(rows, containerCell)
                : "-"}
            </td>
            <td style={templateCellHeightStyle(sealCell ?? { h: 1 })}>
              {sealCell
                ? fieldValue(rows, sealCell)
                : "-"}
            </td>
          </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function renderAmharicSection(section: TemplateSection, rows: Row[]) {
  if (!hasCell(section, "wb_amharic")) {
    return null;
  }

  const cell = findCell(section, "wb_amharic")!;

  return (
    <div key={section.id} className="way-bill-amharic" style={templateCellBlockHeightStyle(cell)}>
      {renderWayBillFieldParagraph(cell, rows)}
    </div>
  );
}

function renderFooterSection(section: TemplateSection, rows: Row[]) {
  const visibleRows = WAY_BILL_FOOTER_ROW_ORDER
    .filter(({ labelId, valueId }) => hasCell(section, labelId) || hasCell(section, valueId))
    .map(({ labelId, valueId }) => ({
      labelId,
      valueId,
      labelCell: findCell(section, labelId),
      valueCell: findCell(section, valueId),
    }))
    .filter((row) => row.labelCell || row.valueCell);

  if (visibleRows.length === 0) {
    return null;
  }

  return (
    <table key={section.id} className="print-table way-bill-table mt-sm">
      <tbody>
        {visibleRows.map(({ labelId, valueId, labelCell, valueCell }) => (
          <tr
            key={`${labelId}-${valueId}`}
            style={maxTemplateCellHeightStyle(labelCell ?? { h: 1 }, valueCell ?? { h: 1 })}
          >
            <th style={templateCellHeightStyle(labelCell ?? { h: 1 })}>
              {labelCell ? renderFooterLabel(labelCell) : "-"}
            </th>
            <td style={templateCellHeightStyle(valueCell ?? { h: 1 })}>
              {valueCell ? renderFooterValueCell(valueCell, rows) : <span>&nbsp;</span>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function renderWayBillSection(section: TemplateSection, rows: Row[], documentId: string) {
  if (section.id === "document_id") {
    if (section.showDocumentId !== true) {
      return null;
    }

    return (
      <p key={section.id} className="permit-doc-id">
        Document ID: {documentId}
      </p>
    );
  }

  switch (section.id) {
    case "header_meta":
      return renderHeaderSection(section, rows);
    case "transport":
      return renderTransportSection(section, rows);
    case "declaration":
      return renderDeclarationSection(section, rows);
    case "conditions":
      return renderConditionsSection(section, rows);
    case "goods":
      return renderGoodsSection(section, rows);
    case "transport_charge":
      return renderTransportChargeSection(section, rows);
    case "containers":
      return renderContainersSection(section, rows);
    case "amharic":
      return renderAmharicSection(section, rows);
    case "footer":
      return renderFooterSection(section, rows);
    default:
      return null;
  }
}

function WayBillDriverPage({
  rows,
  template,
  documentId,
}: {
  rows: Row[];
  template: PersistedIccTemplate;
  documentId: string;
}) {
  const sections = useMemo(
    () => sortWayBillSections(template.sections),
    [template.sections],
  );

  return (
    <section className="way-bill-page">
      {sections.map((section) => renderWayBillSection(section, rows, documentId))}
    </section>
  );
}

export function WayBillTemplatePrintView({
  output,
  documentId,
  template,
}: {
  output: DocumentOutputSnapshot<"way_bill">;
  documentId: string;
  template: PersistedIccTemplate;
}) {
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
        <WayBillDriverPage rows={activeRows} template={template} documentId={documentId} />
      )}
    </article>
  );
}

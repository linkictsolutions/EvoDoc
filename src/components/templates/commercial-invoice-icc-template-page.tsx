"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { useUnsavedChangesGuard } from "@/components/ui/use-unsaved-changes-guard";

const GRID_COLS = 24;
const GRID_ROW_PX = 14;
const SECTION_HEADER_ROWS = 2;
const SECTION_BOTTOM_PADDING_ROWS = 2;
const SECTION_GAP_ROWS = 1;
const TEMPLATE_STORAGE_KEY = "evodoc.templates.commercial_invoice_icc.v1";

type GridCell = {
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
  description?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minH: number;
  cells: GridCell[];
};

function cloneDefaultSections(): TemplateSection[] {
  // Default layout authored for 12 columns; scale to 24 columns for finer resizing.
  const scale = GRID_COLS === 24 ? 2 : 1;
  return DEFAULT_SECTIONS.map((section) => ({
    ...section,
    x: section.x * scale,
    w: section.w * scale,
    cells: section.cells.map((cell) => ({
      ...cell,
      x: cell.x * scale,
      w: cell.w * scale,
    })),
  }));
}

function computeSectionHeightStatic(section: TemplateSection): number {
  const maxContentRow = section.cells.reduce((acc, cell) => Math.max(acc, cell.y + cell.h), 0);
  const computed = SECTION_HEADER_ROWS + maxContentRow + SECTION_BOTTOM_PADDING_ROWS;
  // Allow sections to shrink when fields are removed; enforce only a small structural minimum.
  const structuralMin = SECTION_HEADER_ROWS + SECTION_BOTTOM_PADDING_ROWS + 1;
  return Math.max(structuralMin, computed);
}

function relayoutSectionsStatic(nextSections: TemplateSection[]): TemplateSection[] {
  let cursorY = 0;
  const updated: TemplateSection[] = [];
  // Use the given array order as the stacking order (top -> bottom).
  for (const section of nextSections) {
    const h = computeSectionHeightStatic(section);
    const next = { ...section, y: cursorY, h };
    updated.push(next);
    cursorY = cursorY + h + SECTION_GAP_ROWS;
  }
  const byId = new Map(updated.map((s) => [s.id, s]));
  return nextSections.map((s) => byId.get(s.id) ?? s);
}

function dedupeCells(cells: GridCell[]): GridCell[] {
  const seen = new Set<string>();
  const unique: GridCell[] = [];
  for (const cell of cells) {
    if (seen.has(cell.id)) {
      continue;
    }
    seen.add(cell.id);
    unique.push(cell);
  }
  return unique;
}

function normalizeAvailableFields(fields: Record<string, GridCell[]>): Record<string, GridCell[]> {
  const next: Record<string, GridCell[]> = {};
  for (const [sectionId, list] of Object.entries(fields)) {
    next[sectionId] = dedupeCells(list);
  }
  return next;
}

type PersistedTemplate = {
  version: 1;
  sections: TemplateSection[];
  availableFields: Record<string, GridCell[]>;
  spacerCounter: number;
};

function maxTemplateCols(sections: TemplateSection[]) {
  return sections.reduce((acc, section) => Math.max(acc, section.x + section.w), 0);
}

function scaleSectionsToGrid(sections: TemplateSection[], factor: number): TemplateSection[] {
  return sections.map((section) => ({
    ...section,
    x: section.x * factor,
    w: section.w * factor,
    cells: (section.cells ?? []).map((cell) => ({
      ...cell,
      x: cell.x * factor,
      w: cell.w * factor,
    })),
  }));
}

function scaleAvailableToGrid(fields: Record<string, GridCell[]>, factor: number) {
  const next: Record<string, GridCell[]> = {};
  for (const [sectionId, list] of Object.entries(fields)) {
    next[sectionId] = list.map((cell) => ({ ...cell, x: cell.x * factor, w: cell.w * factor }));
  }
  return next;
}

function GridPreview({
  cols = GRID_COLS,
  rowHeightPx = GRID_ROW_PX,
  cells,
  cornerRadius = 10,
  dragSectionId,
  onDropCell,
  onResizeCell,
  onTransformCell,
  onDeleteCell,
  allowEdit = false,
}: {
  cols?: number;
  rowHeightPx?: number;
  cells: GridCell[];
  cornerRadius?: number;
  dragSectionId?: string;
  allowEdit?: boolean;
  onDropCell?: (
    payload: { kind: "move" | "add" | "add_spacer"; cellId: string; fromSectionId?: string },
    next: { x: number; y: number },
  ) => void;
  onResizeCell?: (cellId: string, next: { w: number; h: number }) => void;
  onTransformCell?: (cellId: string, next: { x: number; y: number; w: number; h: number }) => void;
  onDeleteCell?: (cellId: string) => void;
}) {
  const bounds = useMemo(() => {
    let maxRow = 0;
    for (const cell of cells) {
      maxRow = Math.max(maxRow, cell.y + cell.h);
    }
    return { maxRow };
  }, [cells]);

  const [dropIndicator, setDropIndicator] = useState<{
    mode: "box" | "hline" | "vline";
    x: number;
    y: number;
    w: number;
    h: number;
    dropX: number;
    dropY: number;
  } | null>(null);
  const dropIndicatorRef = useRef<{
    mode: "box" | "hline" | "vline";
    x: number;
    y: number;
    w: number;
    h: number;
    dropX: number;
    dropY: number;
  } | null>(null);
  const dragMetaRef = useRef<{ w: number; h: number } | null>(null);

  function readDragMeta(event: Pick<React.DragEvent, "dataTransfer">): { w: number; h: number } {
    const payload = event.dataTransfer.getData("text/plain");
    if (payload) {
      try {
        const parsed = JSON.parse(payload) as { w?: number; h?: number };
        const w = typeof parsed.w === "number" && Number.isFinite(parsed.w) && parsed.w > 0 ? parsed.w : null;
        const h = typeof parsed.h === "number" && Number.isFinite(parsed.h) && parsed.h > 0 ? parsed.h : null;
        if (w && h) {
          return { w, h };
        }
      } catch {
        // Ignore malformed payloads.
      }
    }

    const wRaw = event.dataTransfer.getData("application/x-evodoc-cell-w");
    const hRaw = event.dataTransfer.getData("application/x-evodoc-cell-h");
    const w = wRaw ? Number(wRaw) : NaN;
    const h = hRaw ? Number(hRaw) : NaN;
    if (Number.isFinite(w) && w > 0 && Number.isFinite(h) && h > 0) {
      return { w, h };
    }

    const globalMeta = (window as unknown as { __evodocDragMeta?: { w: number; h: number } }).__evodocDragMeta;
    if (globalMeta && Number.isFinite(globalMeta.w) && globalMeta.w > 0 && Number.isFinite(globalMeta.h) && globalMeta.h > 0) {
      return globalMeta;
    }

    return dragMetaRef.current ?? { w: 1, h: 1 };
  }

  function snapY(y: number, h: number) {
    // Most cells in this template use even row heights (h=2,4). Snapping drop targets to even rows
    // avoids hard-to-explain 1-row gaps during reordering.
    if (h % 2 === 0) {
      return Math.max(0, y - (y % 2));
    }
    return Math.max(0, y);
  }

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (!allowEdit || !onDropCell) {
        return;
      }

      event.preventDefault();
      setDropIndicator(null);
      dropIndicatorRef.current = null;

      const cellId = event.dataTransfer.getData("application/x-evodoc-cell-id");
      if (!cellId) {
        return;
      }

      const kindRaw = event.dataTransfer.getData("application/x-evodoc-cell-kind");
      const kind: "move" | "add" | "add_spacer" | null =
        kindRaw === "add" || kindRaw === "move" || kindRaw === "add_spacer" ? kindRaw : null;
      if (!kind) {
        return;
      }

      const fromSectionId = event.dataTransfer.getData("application/x-evodoc-cell-section") || undefined;

      const indicator = dropIndicatorRef.current;
      if (indicator) {
        const snappedY = snapY(indicator.dropY, indicator.h);
        onDropCell({ kind, cellId, fromSectionId }, { x: indicator.dropX, y: snappedY });
        return;
      }

      const grid = event.currentTarget;
      const rect = grid.getBoundingClientRect();
      const colWidth = rect.width / cols;
      const x = Math.max(0, Math.min(cols - 1, Math.floor((event.clientX - rect.left) / colWidth)));
      const y = Math.max(0, Math.floor((event.clientY - rect.top) / rowHeightPx));
      const meta = readDragMeta(event);
      onDropCell({ kind, cellId, fromSectionId }, { x, y: snapY(y, meta.h) });
    },
    [allowEdit, cols, onDropCell, rowHeightPx],
  );

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    if (!allowEdit) {
      return;
    }
    event.preventDefault();
    const kindRaw = event.dataTransfer.getData("application/x-evodoc-cell-kind");
    const kind: "move" | "add" | "add_spacer" | null =
      kindRaw === "add" || kindRaw === "move" || kindRaw === "add_spacer" ? kindRaw : null;
    const draggingId = event.dataTransfer.getData("application/x-evodoc-cell-id") || "";
    const grid = event.currentTarget;
    const rect = grid.getBoundingClientRect();
    const colWidth = rect.width / cols;
    const x = Math.max(0, Math.min(cols - 1, Math.floor((event.clientX - rect.left) / colWidth)));
    const y = Math.max(0, Math.floor((event.clientY - rect.top) / rowHeightPx));
    const meta = readDragMeta(event);
    const normalizedW = Math.max(1, Math.min(cols, Math.floor(meta.w)));
    const normalizedH = Math.max(1, Math.floor(meta.h));
    const clampedX = Math.max(0, Math.min(cols - normalizedW, x));
    const candidate = { x: clampedX, y, w: normalizedW, h: normalizedH };
    // When moving an existing cell within this grid, ignore collisions/hit tests against itself.
    const effectiveCells = kind === "move" && draggingId ? cells.filter((cell) => cell.id !== draggingId) : cells;

    const collidesAny = effectiveCells.some((cell) => (
      candidate.x < cell.x + cell.w
      && candidate.x + candidate.w > cell.x
      && candidate.y < cell.y + cell.h
      && candidate.y + candidate.h > cell.y
    ));

    let indicatorY = y;
    let indicatorX = clampedX;
    let mode: "box" | "hline" | "vline" = collidesAny ? "hline" : "box";
    let indicatorH = normalizedH;
    let dropX = clampedX;
    let dropY = y;
    if (collidesAny) {
      const hit = effectiveCells.find((cell) => (
        candidate.x < cell.x + cell.w
        && candidate.x + candidate.w > cell.x
        && y >= cell.y
        && y < cell.y + cell.h
      ));
      if (hit) {
        const pointerRowOffset = (event.clientY - rect.top) / rowHeightPx - hit.y;
        const pointerColOffset = (event.clientX - rect.left) / colWidth - hit.x;

        const pointerCol = (event.clientX - rect.left) / colWidth;
        const isWithinHitX = pointerCol >= hit.x && pointerCol <= hit.x + hit.w;

        // Only show vertical insertion when the cursor is very close to the left/right edge
        // of the hovered cell. Keep this threshold small so normal vertical reordering
        // (cursor near center) isn't hijacked by the left/right guide.
        const edgeThreshold = Math.max(0.3, Math.min(0.45, hit.w * 0.12));
        const isNearLeft = isWithinHitX && pointerColOffset >= 0 && pointerColOffset <= edgeThreshold;
        const isNearRight = isWithinHitX && pointerColOffset <= hit.w && pointerColOffset >= hit.w - edgeThreshold;

        if (isNearLeft || isNearRight) {
          // Vertical insertion guide between adjacent cells (left/right).
          mode = "vline";
          const insertLeft = isNearLeft && !isNearRight;
          const boundaryX = insertLeft ? hit.x : hit.x + hit.w;
          indicatorX = boundaryX;
          indicatorY = hit.y;
          indicatorH = hit.h;
          dropY = hit.y;

          if (insertLeft) {
            dropX = Math.max(0, boundaryX - normalizedW);
          } else {
            dropX = Math.min(cols - normalizedW, boundaryX);
          }
        } else {
          // Horizontal insertion guide between rows (above/below).
          mode = "hline";
          indicatorY = pointerRowOffset < hit.h / 2 ? hit.y : hit.y + hit.h;
          indicatorH = hit.h;
          dropX = clampedX;
          dropY = indicatorY;
        }
      }
    }
    indicatorY = snapY(indicatorY, normalizedH);
    dropY = snapY(dropY, normalizedH);

    const nextIndicator = {
      mode,
      x: mode === "vline" ? indicatorX : candidate.x,
      y: indicatorY,
      w: candidate.w,
      h: mode === "vline" ? indicatorH : candidate.h,
      dropX,
      dropY,
    } as const;
    setDropIndicator(nextIndicator);
    dropIndicatorRef.current = nextIndicator;
  }, [allowEdit, cells, cols, rowHeightPx]);

  const onDragLeave = useCallback(() => {
    setDropIndicator(null);
    dropIndicatorRef.current = null;
  }, []);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gridAutoRows: `${rowHeightPx}px`,
        gap: 0,
        alignContent: "start",
        position: "relative",
      }}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragLeave={onDragLeave}
    >
      {allowEdit && dropIndicator ? (
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: `${(dropIndicator.x / cols) * 100}%`,
            width: dropIndicator.mode === "vline" ? 2 : `${(dropIndicator.w / cols) * 100}%`,
            top: dropIndicator.y * rowHeightPx,
            height: dropIndicator.mode === "box"
              ? dropIndicator.h * rowHeightPx
              : dropIndicator.mode === "vline"
                ? dropIndicator.h * rowHeightPx
                : 2,
            border: dropIndicator.mode === "box" ? "2px solid rgba(59, 130, 246, 0.95)" : "none",
            boxShadow: dropIndicator.mode === "box" ? "0 0 0 3px rgba(59, 130, 246, 0.14)" : "0 0 0 3px rgba(59, 130, 246, 0.18)",
            background: dropIndicator.mode === "box" ? "rgba(59, 130, 246, 0.06)" : "rgba(59, 130, 246, 0.95)",
            pointerEvents: "none",
            zIndex: 5,
            boxSizing: "border-box",
          }}
        />
      ) : null}
      {cells.map((cell) => (
        <div
          key={cell.id}
          style={{
            gridColumn: `${cell.x + 1} / span ${cell.w}`,
            gridRow: `${cell.y + 1} / span ${cell.h}`,
            border: "1px solid rgba(148, 163, 184, 0.65)",
            background: "rgba(255,255,255,0.72)",
            padding: "6px 8px",
            fontSize: "0.74rem",
            lineHeight: 1.2,
            color: "#0f172a",
            boxSizing: "border-box",
            overflow: "hidden",
            borderTopLeftRadius: cell.x === 0 && cell.y === 0 ? cornerRadius : 0,
            borderTopRightRadius: cell.x + cell.w === cols && cell.y === 0 ? cornerRadius : 0,
            borderBottomLeftRadius: cell.x === 0 && cell.y + cell.h === bounds.maxRow ? cornerRadius : 0,
            borderBottomRightRadius: cell.x + cell.w === cols && cell.y + cell.h === bounds.maxRow ? cornerRadius : 0,
            display: "grid",
            alignContent: "center",
            position: "relative",
          }}
          title={cell.label}
          draggable={allowEdit}
          onDragStart={(event) => {
            if (!allowEdit) {
              return;
            }
            event.dataTransfer.setData("application/x-evodoc-cell-id", cell.id);
            event.dataTransfer.setData("application/x-evodoc-cell-kind", "move");
            event.dataTransfer.setData("application/x-evodoc-cell-section", dragSectionId ?? "__grid__");
            event.dataTransfer.setData("application/x-evodoc-cell-w", String(cell.w));
            event.dataTransfer.setData("application/x-evodoc-cell-h", String(cell.h));
            event.dataTransfer.setData("text/plain", JSON.stringify({
              id: cell.id,
              w: cell.w,
              h: cell.h,
              fromSectionId: dragSectionId,
              kind: "move",
            }));
            dragMetaRef.current = { w: cell.w, h: cell.h };
            (window as unknown as { __evodocDragMeta?: { w: number; h: number } }).__evodocDragMeta = { w: cell.w, h: cell.h };
          }}
        >
          <strong style={{ fontWeight: 700, whiteSpace: "normal", wordBreak: "break-word" }}>
            {cell.label}
          </strong>

          {allowEdit ? (
            <>
              <button
                type="button"
                onClick={() => onDeleteCell?.(cell.id)}
                aria-label={`Remove ${cell.label}`}
                style={{
                  position: "absolute",
                  top: 4,
                  right: 16,
                  width: 18,
                  height: 18,
                  borderRadius: 999,
                  border: "1px solid rgba(148,163,184,0.9)",
                  background: "rgba(255,255,255,0.9)",
                  color: "#0f172a",
                  fontSize: 12,
                  lineHeight: "16px",
                  padding: 0,
                  cursor: "pointer",
                }}
              >
                ×
              </button>

              {/* Top-left resize handle (invisible). */}
              <div
                role="presentation"
                onPointerDown={(event) => {
                  if (!onTransformCell) {
                    return;
                  }
                  event.preventDefault();
                  event.stopPropagation();

                  const startClientX = event.clientX;
                  const startClientY = event.clientY;
                  const startX = cell.x;
                  const startY = cell.y;
                  const startW = cell.w;
                  const startH = cell.h;

                  const target = event.currentTarget;
                  (target as HTMLElement).setPointerCapture(event.pointerId);

                  const onMove = (moveEvent: PointerEvent) => {
                    const dx = moveEvent.clientX - startClientX;
                    const dy = moveEvent.clientY - startClientY;
                    const parent = (target as HTMLElement).parentElement?.parentElement as HTMLElement | null;
                    const parentRect = parent?.getBoundingClientRect();
                    const colWidth = parentRect ? parentRect.width / cols : 1;
                    const dCols = Math.round(dx / colWidth);
                    const dRows = Math.round(dy / rowHeightPx);

                    const nextX = Math.max(0, Math.min(cols - 1, startX + dCols));
                    const nextY = Math.max(0, startY + dRows);
                    const nextW = Math.max(1, Math.min(cols - nextX, startW - dCols));
                    const nextH = Math.max(1, startH - dRows);

                    onTransformCell(cell.id, { x: nextX, y: nextY, w: nextW, h: nextH });
                  };

                  const onUp = () => {
                    window.removeEventListener("pointermove", onMove);
                    window.removeEventListener("pointerup", onUp);
                  };

                  window.addEventListener("pointermove", onMove);
                  window.addEventListener("pointerup", onUp);
                }}
                style={{
                  position: "absolute",
                  left: 2,
                  top: 2,
                  width: 14,
                  height: 14,
                  cursor: "nwse-resize",
                  background: "transparent",
                }}
              />

              <div
                role="presentation"
                onPointerDown={(event) => {
                  if (!onResizeCell) {
                    return;
                  }
                  event.preventDefault();
                  event.stopPropagation();

                  const startX = event.clientX;
                  const startY = event.clientY;
                  const startW = cell.w;
                  const startH = cell.h;

                  const target = event.currentTarget;
                  (target as HTMLElement).setPointerCapture(event.pointerId);

                  const onMove = (moveEvent: PointerEvent) => {
                    const dx = moveEvent.clientX - startX;
                    const dy = moveEvent.clientY - startY;
                    // Approximate column width using parent element width.
                    const parent = (target as HTMLElement).parentElement?.parentElement as HTMLElement | null;
                    const parentRect = parent?.getBoundingClientRect();
                    const colWidth = parentRect ? parentRect.width / cols : 1;
                    const dw = Math.round(dx / colWidth);
                    const dh = Math.round(dy / rowHeightPx);

                    const nextW = Math.max(1, Math.min(cols - cell.x, startW + dw));
                    const nextH = Math.max(1, startH + dh);
                    onResizeCell(cell.id, { w: nextW, h: nextH });
                  };

                  const onUp = () => {
                    window.removeEventListener("pointermove", onMove);
                    window.removeEventListener("pointerup", onUp);
                  };

                  window.addEventListener("pointermove", onMove);
                  window.addEventListener("pointerup", onUp);
                }}
                style={{
                  position: "absolute",
                  right: 2,
                  bottom: 2,
                  width: 12,
                  height: 12,
                  cursor: "nwse-resize",
                  background:
                    "linear-gradient(135deg, transparent 50%, rgba(71,85,105,0.55) 50%)",
                }}
              />
            </>
          ) : null}
        </div>
      ))}
    </div>
  );
}

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
  const toast = useToast();
  const [showGrid, setShowGrid] = useState(true);
  const [sections, setSections] = useState<TemplateSection[]>(() => relayoutSectionsStatic(cloneDefaultSections()));
  const [availableFields, setAvailableFields] = useState<Record<string, GridCell[]>>(() => ({}));
  const spacerCounterRef = useRef(1);
  const [savedSnapshot, setSavedSnapshot] = useState<string>(() => "");
  const previewRef = useRef<HTMLElement | null>(null);
  const [previewWidth, setPreviewWidth] = useState(0);
  const [sectionDropIndex, setSectionDropIndex] = useState<number | null>(null);
  const sectionDragIdRef = useRef<string | null>(null);

  const collides = useCallback((a: Pick<GridCell, "x" | "y" | "w" | "h">, b: GridCell) => {
    const ax2 = a.x + a.w;
    const ay2 = a.y + a.h;
    const bx2 = b.x + b.w;
    const by2 = b.y + b.h;
    return a.x < bx2 && ax2 > b.x && a.y < by2 && ay2 > b.y;
  }, []);

  const compactCells = useCallback((cells: GridCell[]): GridCell[] => {
    const sorted = cells
      .map((cell) => ({ ...cell }))
      .sort((a, b) => (a.y - b.y) || (a.x - b.x) || a.id.localeCompare(b.id));

    const placed: GridCell[] = [];
    for (const cell of sorted) {
      // Move up as far as possible without colliding, keeping x fixed.
      let nextY = Math.max(0, cell.y);
      let guard = 0;
      while (nextY > 0 && guard < 500) {
        const candidate = { ...cell, y: nextY - 1 };
        if (placed.some((other) => collides(candidate, other))) {
          break;
        }
        nextY -= 1;
        guard += 1;
      }
      cell.y = nextY;
      // If we still collide (e.g., due to same starting y), push down until no collision.
      guard = 0;
      while (placed.some((other) => collides(cell, other)) && guard < 500) {
        cell.y += 1;
        guard += 1;
      }
      placed.push(cell);
    }

    const byId = new Map(placed.map((cell) => [cell.id, cell]));
    return cells.map((cell) => byId.get(cell.id) ?? cell);
  }, [collides]);

  const compactCellsPinned = useCallback((cells: GridCell[], pinnedId: string): GridCell[] => {
    const pinned = cells.find((cell) => cell.id === pinnedId);
    if (!pinned) {
      return compactCells(cells);
    }

    const others = cells
      .filter((cell) => cell.id !== pinnedId)
      .map((cell) => ({ ...cell }))
      .sort((a, b) => (a.y - b.y) || (a.x - b.x) || a.id.localeCompare(b.id));

    const placed: GridCell[] = [{ ...pinned }];
    for (const cell of others) {
      let nextY = Math.max(0, cell.y);
      let guard = 0;
      while (nextY > 0 && guard < 500) {
        const candidate = { ...cell, y: nextY - 1 };
        if (placed.some((other) => collides(candidate, other))) {
          break;
        }
        nextY -= 1;
        guard += 1;
      }
      cell.y = nextY;
      guard = 0;
      while (placed.some((other) => collides(cell, other)) && guard < 500) {
        cell.y += 1;
        guard += 1;
      }
      placed.push(cell);
    }

    const byId = new Map(placed.map((cell) => [cell.id, cell]));
    return cells.map((cell) => byId.get(cell.id) ?? cell);
  }, [collides, compactCells]);

  const computeSectionHeight = useCallback((section: TemplateSection): number => {
    return computeSectionHeightStatic(section);
  }, []);

  const relayoutSections = useCallback((nextSections: TemplateSection[]): TemplateSection[] => {
    let cursorY = 0;
    const updated: TemplateSection[] = [];
    for (const section of nextSections) {
      const h = computeSectionHeight(section);
      const next = { ...section, y: cursorY, h };
      updated.push(next);
      cursorY = cursorY + h + SECTION_GAP_ROWS;
    }
    const byId = new Map(updated.map((s) => [s.id, s]));
    return nextSections.map((s) => byId.get(s.id) ?? s);
  }, [computeSectionHeight]);

  const updateSection = useCallback(
    (sectionId: string, updater: (section: TemplateSection) => TemplateSection) => {
      setSections((current) => {
        const next = current.map((section) => (section.id === sectionId ? updater(section) : section));
        return relayoutSections(next);
      });
    },
    [relayoutSections],
  );

  const serializeTemplate = useCallback((input: {
    sections: TemplateSection[];
    availableFields: Record<string, GridCell[]>;
    spacerCounter: number;
  }) => {
    // Produce a stable JSON string to compare for "dirty" detection.
    const normalizedSections = input.sections.map((section) => ({
      ...section,
      cells: dedupeCells(section.cells)
        .map((cell) => ({ ...cell }))
        .sort((a, b) => (a.y - b.y) || (a.x - b.x) || a.id.localeCompare(b.id)),
    }));
    const normalizedAvailable = Object.fromEntries(
      Object.entries(normalizeAvailableFields(input.availableFields))
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([sectionId, list]) => [sectionId, list
          .map((cell) => ({ ...cell }))
          .sort((a, b) => a.id.localeCompare(b.id))]),
    ) as Record<string, GridCell[]>;

    const payload: PersistedTemplate = {
      version: 1,
      sections: normalizedSections,
      availableFields: normalizedAvailable,
      spacerCounter: input.spacerCounter,
    };
    return JSON.stringify(payload);
  }, []);

  const currentSnapshot = useMemo(() => serializeTemplate({
    sections,
    availableFields,
    spacerCounter: spacerCounterRef.current,
  }), [availableFields, sections, serializeTemplate]);

  const isDirty = useMemo(() => {
    if (!savedSnapshot) {
      return false;
    }
    return currentSnapshot !== savedSnapshot;
  }, [currentSnapshot, savedSnapshot]);

  useUnsavedChangesGuard({
    enabled: isDirty,
    message: "You have unsaved template changes. Save or discard them before leaving this page.",
  });

  useEffect(() => {
    // Load saved template state (if any) and set the baseline snapshot.
    try {
      const raw = window.localStorage.getItem(TEMPLATE_STORAGE_KEY);
      if (!raw) {
        const baseline = serializeTemplate({
          sections: relayoutSectionsStatic(cloneDefaultSections()),
          availableFields: {},
          spacerCounter: 1,
        });
        setSavedSnapshot(baseline);
        return;
      }

      const parsed = JSON.parse(raw) as PersistedTemplate;
      if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.sections)) {
        throw new Error("Invalid template payload");
      }

      const parsedSections = parsed.sections.map((section) => ({
        ...section,
        cells: dedupeCells(section.cells ?? []).map((cell) => ({ ...cell })),
      }));
      const parsedAvailable = normalizeAvailableFields(parsed.availableFields ?? {});

      // Migrate any old 12-column saved template into the 24-column editor.
      const cols = maxTemplateCols(parsedSections);
      const needsScaleUp = GRID_COLS === 24 && cols <= 12;
      const scaledSections = needsScaleUp ? scaleSectionsToGrid(parsedSections, 2) : parsedSections;
      const scaledAvailable = needsScaleUp ? scaleAvailableToGrid(parsedAvailable, 2) : parsedAvailable;

      const nextSections = relayoutSectionsStatic(scaledSections);
      const nextAvailable = normalizeAvailableFields(scaledAvailable);
      setSections(nextSections);
      setAvailableFields(nextAvailable);
      spacerCounterRef.current = typeof parsed.spacerCounter === "number" && parsed.spacerCounter > 0
        ? parsed.spacerCounter
        : 1;
      setSavedSnapshot(serializeTemplate({
        sections: nextSections,
        availableFields: nextAvailable,
        spacerCounter: spacerCounterRef.current,
      }));
    } catch {
      const baseline = serializeTemplate({
        sections: relayoutSectionsStatic(cloneDefaultSections()),
        availableFields: {},
        spacerCounter: 1,
      });
      setSavedSnapshot(baseline);
    }
    // Intentionally run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const resolveLayout = useCallback((cells: GridCell[], pinnedId: string): GridCell[] => {
    const pinned = cells.find((cell) => cell.id === pinnedId);
    if (!pinned) {
      return cells;
    }

    const packRowAroundPinned = (input: GridCell[]): GridCell[] => {
      const rowY = pinned.y;
      const rowH = pinned.h;
      const inRow = input.filter((cell) => cell.y === rowY && cell.h === rowH);
      if (inRow.length <= 1) {
        return input;
      }

      const others = inRow
        .filter((cell) => cell.id !== pinnedId)
        .map((cell) => ({ ...cell }))
        .sort((a, b) => (a.x - b.x) || a.id.localeCompare(b.id));

      // Pack from left to right, skipping over the pinned cell's reserved span.
      let cursor = 0;
      const reservedStart = pinned.x;
      const reservedEnd = pinned.x + pinned.w;
      for (const cell of others) {
        // If placing this cell would collide with the reserved span, jump cursor after it.
        if (cursor < reservedEnd && cursor + cell.w > reservedStart) {
          cursor = reservedEnd;
        }
        cell.x = Math.min(Math.max(0, cursor), GRID_COLS - cell.w);
        cursor = cell.x + cell.w;
      }

      const byId = new Map<string, GridCell>();
      for (const cell of input) {
        byId.set(cell.id, cell);
      }
      for (const cell of others) {
        byId.set(cell.id, cell);
      }

      return input.map((cell) => byId.get(cell.id) ?? cell);
    };

    const rowPacked = packRowAroundPinned(cells);

    const placed: GridCell[] = [{ ...pinned }];
    const rest = rowPacked
      .filter((cell) => cell.id !== pinnedId)
      .map((cell) => ({ ...cell }))
      .sort((a, b) => (a.y - b.y) || (a.x - b.x));

    for (const cell of rest) {
      let guard = 0;
      while (placed.some((other) => collides(cell, other)) && guard < 500) {
        cell.y += 1;
        guard += 1;
      }
      placed.push(cell);
    }

    const byId = new Map(placed.map((cell) => [cell.id, cell]));
    return rowPacked.map((cell) => byId.get(cell.id) ?? cell);
  }, [collides]);

  const clampSize = useCallback((cell: GridCell, desired: { w: number; h: number }) => {
    const w = Math.max(1, Math.min(GRID_COLS - cell.x, desired.w));
    const h = Math.max(1, desired.h);
    return { w, h };
  }, []);

  // Editor should not scale content down (it makes arranging hard). We will only scale at print/export time.
  const pageScale = 1;

  const maxGridRow = useMemo(() => {
    return sections.reduce((acc, section) => Math.max(acc, section.y + section.h), 0);
  }, [sections]);

  const previewHeights = useMemo(() => {
    const a4Height = previewWidth > 0 ? previewWidth * (297 / 210) : 0;
    const contentHeight = (maxGridRow * GRID_ROW_PX) * pageScale + 28; // include inset(14px) top+bottom
    const outerHeight = Math.max(a4Height, contentHeight);
    return { a4Height, contentHeight, outerHeight };
  }, [maxGridRow, pageScale, previewWidth]);

  useEffect(() => {
    const node = previewRef.current;
    if (!node) {
      return;
    }
    setPreviewWidth(node.getBoundingClientRect().width);
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        if (width > 0) {
          setPreviewWidth(width);
        }
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const moveCellWithinSection = useCallback((sectionId: string, cellId: string, next: { x: number; y: number }) => {
    updateSection(sectionId, (section) => {
      const moving = section.cells.find((cell) => cell.id === cellId);
      if (!moving) {
        return section;
      }
      const clampedX = Math.max(0, Math.min(GRID_COLS - moving.w, next.x));
      const desired = { ...moving, x: clampedX, y: Math.max(0, next.y) };
      // Remove the moving cell first, compact remaining cells to fill its gap,
      // then insert the moved cell at the requested spot and resolve collisions.
      const others = section.cells.filter((cell) => cell.id !== cellId);
      const compactedOthers = compactCells(dedupeCells(others));
      const inserted = dedupeCells([...compactedOthers, desired]);
      const nextCells = compactCellsPinned(resolveLayout(inserted, cellId), cellId);
      return { ...section, cells: nextCells };
    });
  }, [compactCells, compactCellsPinned, resolveLayout, updateSection]);

  const resizeCellWithinSection = useCallback((sectionId: string, cellId: string, next: { w: number; h: number }) => {
    updateSection(sectionId, (section) => {
      const current = section.cells.find((cell) => cell.id === cellId);
      if (!current) {
        return section;
      }
      const resolved = clampSize(current, next);

      let updated = section.cells.map((cell) => (cell.id === cellId ? { ...cell, ...resolved } : cell));

      // If there's a directly-adjacent cell to the right on the same row (same y/h),
      // resizing width redistributes space between them to preserve the row structure.
      const deltaW = resolved.w - current.w;
      if (deltaW !== 0) {
        const rightNeighbor = section.cells.find((cell) => (
          cell.id !== cellId
          && cell.y === current.y
          && cell.h === current.h
          && cell.x === current.x + current.w
        ));
        if (rightNeighbor) {
          const maxGive = Math.max(0, rightNeighbor.w - 1);
          const take = deltaW > 0 ? Math.min(deltaW, maxGive) : 0;
          const giveBack = deltaW < 0 ? Math.min(-deltaW, GRID_COLS - (rightNeighbor.x + rightNeighbor.w)) : 0;

          if (deltaW > 0 && take > 0) {
            updated = updated.map((cell) => {
              if (cell.id === cellId) return { ...cell, w: current.w + take };
              if (cell.id === rightNeighbor.id) return { ...cell, x: rightNeighbor.x + take, w: rightNeighbor.w - take };
              return cell;
            });
          } else if (deltaW < 0 && giveBack >= 0) {
            // When shrinking, grow the right neighbor to fill the gap by moving it left.
            const grow = -deltaW;
            updated = updated.map((cell) => {
              if (cell.id === cellId) return { ...cell, w: Math.max(1, current.w - grow) };
              if (cell.id === rightNeighbor.id) return { ...cell, x: Math.max(0, rightNeighbor.x - grow), w: rightNeighbor.w + grow };
              return cell;
            });
          }
        }
      }

      const nextCells = compactCellsPinned(resolveLayout(dedupeCells(updated), cellId), cellId);
      return { ...section, cells: nextCells };
    });
  }, [clampSize, compactCellsPinned, resolveLayout, updateSection]);

  const transformCellWithinSection = useCallback((
    sectionId: string,
    cellId: string,
    next: { x: number; y: number; w: number; h: number },
  ) => {
    updateSection(sectionId, (section) => {
      const current = section.cells.find((cell) => cell.id === cellId);
      if (!current) {
        return section;
      }

      const clampedX = Math.max(0, Math.min(GRID_COLS - 1, next.x));
      const clampedY = Math.max(0, next.y);
      const desired = clampSize({ ...current, x: clampedX }, { w: next.w, h: next.h });
      const updatedCell: GridCell = {
        ...current,
        x: Math.max(0, Math.min(GRID_COLS - desired.w, clampedX)),
        y: clampedY,
        w: desired.w,
        h: desired.h,
      };

      const others = section.cells.filter((cell) => cell.id !== cellId).map((cell) => ({ ...cell }));

      // Resizing from top/left must not shove other cells around. Instead, clamp the resize
      // so the updated cell stays within free space (no overlap).
      const collidesAny = (candidate: GridCell) => others.some((other) => collides(candidate, other));

      let safe = { ...updatedCell };

      // If growing upward/left causes collisions, reduce the growth until it fits.
      // (Shrinking from top/left should never require moving others.)
      if (collidesAny(safe)) {
        // Clamp vertical growth upward.
        if (safe.y < current.y || safe.h > current.h) {
          let test = { ...safe };
          // First, prevent moving above into occupied space by nudging y down until no collision.
          let guard = 0;
          while (collidesAny(test) && guard < 200) {
            // Prefer undoing upward growth by moving y down and reducing h accordingly.
            if (test.y < current.y && test.h > 1) {
              test.y += 1;
              test.h = Math.max(1, test.h - 1);
            } else if (test.h > 1) {
              test.h = Math.max(1, test.h - 1);
            } else {
              break;
            }
            guard += 1;
          }
          safe = test;
        }

        // Clamp horizontal growth leftward.
        if (safe.x < current.x || safe.w > current.w) {
          let test = { ...safe };
          let guard = 0;
          while (collidesAny(test) && guard < 200) {
            if (test.x < current.x && test.w > 1) {
              test.x += 1;
              test.w = Math.max(1, test.w - 1);
            } else if (test.w > 1) {
              test.w = Math.max(1, test.w - 1);
            } else {
              break;
            }
            guard += 1;
          }
          safe = test;
        }

        // If still colliding (e.g. shrinking into another cell due to y changes), fall back to current.
        if (collidesAny(safe)) {
          safe = { ...current };
        }
      }

      const inserted = dedupeCells([...others, safe]);
      // Keep layout stable: resolve only to ensure the resized cell doesn't overlap (should already be safe).
      const nextCells = resolveLayout(inserted, cellId);
      return { ...section, cells: nextCells };
    });
  }, [clampSize, collides, resolveLayout, updateSection]);

  const removeCellFromSection = useCallback((sectionId: string, cellId: string) => {
    updateSection(sectionId, (section) => {
      const removed = section.cells.find((cell) => cell.id === cellId);
      if (!removed) {
        return section;
      }

      if (!removed.id.startsWith("spacer_")) {
        setAvailableFields((prev) => {
          const existing = prev[sectionId] ?? [];
          if (existing.some((cell) => cell.id === removed.id)) {
            return prev;
          }
          return normalizeAvailableFields({ ...prev, [sectionId]: [...existing, removed] });
        });
      }

      return { ...section, cells: compactCells(dedupeCells(section.cells.filter((cell) => cell.id !== cellId))) };
    });
  }, [compactCells, updateSection]);

  const addAvailableFieldToSection = useCallback((sectionId: string, cellId: string, next: { x: number; y: number }) => {
    setAvailableFields((prev) => {
      const list = prev[sectionId] ?? [];
      const picked = list.find((cell) => cell.id === cellId);
      if (!picked) {
        return prev;
      }
      updateSection(sectionId, (section) => {
        if (section.cells.some((cell) => cell.id === picked.id)) {
          return section;
        }
        const clampedX = Math.max(0, Math.min(GRID_COLS - picked.w, next.x));
        const desired = { ...picked, x: clampedX, y: Math.max(0, next.y) };
        const updated = compactCellsPinned(resolveLayout(dedupeCells([...section.cells, desired]), picked.id), picked.id);
        return { ...section, cells: updated };
      });
      return normalizeAvailableFields({ ...prev, [sectionId]: list.filter((cell) => cell.id !== cellId) });
    });
  }, [compactCellsPinned, resolveLayout, updateSection]);

  const addSpacerToSection = useCallback((sectionId: string, next: { x: number; y: number }) => {
    updateSection(sectionId, (section) => {
      const id = `spacer_${sectionId}_${spacerCounterRef.current++}`;
      const spacer: GridCell = { id, label: "(spacer)", x: next.x, y: next.y, w: GRID_COLS / 2, h: 2 };
      const clampedX = Math.max(0, Math.min(GRID_COLS - spacer.w, spacer.x));
      const desired = { ...spacer, x: clampedX, y: Math.max(0, spacer.y) };
      const updated = compactCellsPinned(resolveLayout(dedupeCells([...section.cells, desired]), desired.id), desired.id);
      return { ...section, cells: updated };
    });
  }, [compactCellsPinned, resolveLayout, updateSection]);

  const moveCellAcrossSections = useCallback((fromSectionId: string, toSectionId: string, cellId: string, next: { x: number; y: number }) => {
    if (fromSectionId === toSectionId) {
      moveCellWithinSection(toSectionId, cellId, next);
      return;
    }

    // Remove from source section first.
    let movingCell: GridCell | null = null;
    updateSection(fromSectionId, (fromSection) => {
      const found = fromSection.cells.find((cell) => cell.id === cellId) ?? null;
      if (!found) {
        return fromSection;
      }
      movingCell = { ...found };
      const remaining = fromSection.cells.filter((cell) => cell.id !== cellId);
      return { ...fromSection, cells: compactCells(dedupeCells(remaining)) };
    });

    // Insert into target section at drop location (keeping its original w/h).
    if (!movingCell) {
      return;
    }

    updateSection(toSectionId, (toSection) => {
      if (toSection.cells.some((cell) => cell.id === movingCell?.id)) {
        return toSection;
      }
      const clampedX = Math.max(0, Math.min(GRID_COLS - movingCell.w, next.x));
      const desired = { ...movingCell, x: clampedX, y: Math.max(0, next.y) };
      const inserted = dedupeCells([...toSection.cells, desired]);
      const nextCells = compactCellsPinned(resolveLayout(inserted, desired.id), desired.id);
      return { ...toSection, cells: nextCells };
    });
  }, [compactCells, compactCellsPinned, moveCellWithinSection, resolveLayout, updateSection]);

  const reorderSectionsByIndex = useCallback((dragId: string, targetIndex: number) => {
    setSections((current) => {
      const fromIndex = current.findIndex((section) => section.id === dragId);
      if (fromIndex === -1) {
        return current;
      }
      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      const clamped = Math.max(0, Math.min(next.length, targetIndex));
      next.splice(clamped, 0, moved);
      return relayoutSections(next);
    });
  }, [relayoutSections]);

  return (
    <section className="page-shell">
      <header className="page-header">
        <h1>Commercial Invoice (ICC) Template</h1>
        <p>
          This screen will map the existing ICC invoice layout into a structured A4 grid (x/y/w/h blocks).
        </p>
      </header>

      <section className="card">
        <div className="row-actions" style={{ justifyContent: "space-between" }}>
          <div>
            <h2 style={{ margin: 0 }}>A4 Grid Preview</h2>
            <p className="muted-text" style={{ margin: "0.25rem 0 0" }}>
              Static mapping of the current invoice layout into 24 columns (drag/resize comes next).
            </p>
          </div>
          <div className="row-actions">
            <button
              type="button"
              className="button-secondary"
              disabled={!isDirty}
              onClick={() => {
                try {
                  window.localStorage.setItem(TEMPLATE_STORAGE_KEY, currentSnapshot);
                  setSavedSnapshot(currentSnapshot);
                  toast.success("Template saved.");
                } catch {
                  toast.error("Failed to save template in this browser.");
                }
              }}
            >
              Save
            </button>
            <button
              type="button"
              className="button-secondary"
              disabled={!isDirty}
              onClick={() => {
                try {
                  const parsed = JSON.parse(savedSnapshot) as PersistedTemplate;
                  const nextSections = relayoutSectionsStatic(parsed.sections.map((section) => ({
                    ...section,
                    cells: dedupeCells(section.cells ?? []).map((cell) => ({ ...cell })),
                  })));
                  const nextAvailable = normalizeAvailableFields(parsed.availableFields ?? {});
                  setSections(nextSections);
                  setAvailableFields(nextAvailable);
                  spacerCounterRef.current = typeof parsed.spacerCounter === "number" && parsed.spacerCounter > 0
                    ? parsed.spacerCounter
                    : 1;
                  toast.success("Discarded unsaved changes.");
                } catch {
                  setSections(relayoutSectionsStatic(cloneDefaultSections()));
                  setAvailableFields({});
                  spacerCounterRef.current = 1;
                  toast.success("Discarded unsaved changes.");
                }
              }}
            >
              Discard
            </button>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", margin: 0 }}>
              <input
                type="checkbox"
                checked={showGrid}
                onChange={(event) => setShowGrid(event.target.checked)}
              />
              <span style={{ color: "var(--text)" }}>Show grid</span>
            </label>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(280px, 360px) 1fr",
            gap: "1rem",
            marginTop: "1rem",
            alignItems: "start",
          }}
        >
          <section
            className="card"
            style={{
              margin: 0,
              padding: "0.9rem",
              position: "sticky",
              top: 0,
              alignSelf: "start",
              height: "calc(100vh - 120px)",
              overflow: "auto",
            }}
          >
            <div
              style={{
                position: "sticky",
                top: 0,
                background: "var(--bg)",
                paddingBottom: "0.75rem",
                zIndex: 2,
              }}
            >
              <div className="row-actions" style={{ justifyContent: "space-between" }}>
                <h3 style={{ marginTop: 0, marginBottom: 0 }}>Available Fields</h3>
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() => {
                    const nextSections = relayoutSectionsStatic(cloneDefaultSections());
                    setSections(nextSections);
                    setAvailableFields({});
                    spacerCounterRef.current = 1;
                    toast.success("Template reset. Click Save to keep it.");
                  }}
                >
                  Reset Template
                </button>
              </div>
              <p className="muted-text" style={{ marginTop: "0.5rem", marginBottom: 0 }}>
                Drag fields from here back into the grid after removing them.
              </p>
            </div>
            <div style={{ borderTop: "1px solid rgba(148,163,184,0.35)", paddingTop: "0.75rem", marginTop: "0.75rem" }}>
              <strong>Utilities</strong>
              <div style={{ display: "grid", gap: "0.4rem", marginTop: "0.5rem" }}>
                <div
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData("application/x-evodoc-cell-id", "spacer");
                    event.dataTransfer.setData("application/x-evodoc-cell-kind", "add_spacer");
                    event.dataTransfer.setData("application/x-evodoc-cell-section", "");
                    event.dataTransfer.setData("application/x-evodoc-cell-w", String(GRID_COLS / 2));
                    event.dataTransfer.setData("application/x-evodoc-cell-h", "2");
                    event.dataTransfer.setData("text/plain", JSON.stringify({
                      id: "spacer",
                      w: GRID_COLS / 2,
                      h: 2,
                      kind: "add_spacer",
                    }));
                    (window as unknown as { __evodocDragMeta?: { w: number; h: number } }).__evodocDragMeta = { w: GRID_COLS / 2, h: 2 };
                  }}
                  style={{
                    border: "1px dashed rgba(148,163,184,0.85)",
                    borderRadius: "10px",
                    padding: "8px 10px",
                    background: "rgba(255,255,255,0.7)",
                    cursor: "grab",
                  }}
                  title="Drag into a section to add spacing"
                >
                  <div style={{ fontWeight: 700 }}>(spacer)</div>
                  <div className="muted-text" style={{ fontSize: "0.75rem" }}>Unlimited</div>
                </div>
              </div>
            </div>
            {Object.keys(availableFields).length === 0 ? (
              <p className="muted-text">No removed fields yet.</p>
            ) : (
              <div style={{ display: "grid", gap: "0.8rem" }}>
                {sections.map((section) => {
                  const items = availableFields[section.id] ?? [];
                  if (items.length === 0) {
                    return null;
                  }
                  return (
                    <div key={section.id}>
                      <strong>{section.label}</strong>
                      <div style={{ display: "grid", gap: "0.4rem", marginTop: "0.35rem" }}>
                        {items.map((cell) => (
                          <div
                            key={cell.id}
                            draggable
                            onDragStart={(event) => {
                              event.dataTransfer.setData("application/x-evodoc-cell-id", cell.id);
                              event.dataTransfer.setData("application/x-evodoc-cell-kind", "add");
                              event.dataTransfer.setData("application/x-evodoc-cell-section", section.id);
                              event.dataTransfer.setData("application/x-evodoc-cell-w", String(cell.w));
                              event.dataTransfer.setData("application/x-evodoc-cell-h", String(cell.h));
                              event.dataTransfer.setData("text/plain", JSON.stringify({
                                id: cell.id,
                                w: cell.w,
                                h: cell.h,
                                sectionId: section.id,
                                kind: "add",
                              }));
                              (window as unknown as { __evodocDragMeta?: { w: number; h: number } }).__evodocDragMeta = { w: cell.w, h: cell.h };
                            }}
                            style={{
                              border: "1px solid rgba(148,163,184,0.6)",
                              borderRadius: "10px",
                              padding: "8px 10px",
                              background: "rgba(255,255,255,0.7)",
                              cursor: "grab",
                            }}
                            title="Drag into the grid"
                          >
                            <div style={{ fontWeight: 700 }}>{cell.label}</div>
                            <div className="muted-text" style={{ fontSize: "0.75rem" }}>
                              {cell.id}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

	          <div
	            style={{
	              display: "grid",
	              gridTemplateRows: "1fr auto",
	              gap: "0.75rem",
	              maxHeight: "calc(100vh - 180px)",
	            }}
	          >
	            <div style={{ overflow: "auto", paddingRight: "0.25rem", paddingBottom: "1.25rem" }}>
	            <section
	              aria-label="A4 preview"
	              ref={(node) => {
	                previewRef.current = node;
	              }}
              style={{
                background: "#fff",
                border: "1px solid var(--border-strong)",
                borderRadius: "14px",
                boxShadow: "0 2px 12px rgba(15, 23, 42, 0.08)",
                width: "100%",
                maxWidth: "860px",
                marginLeft: "auto",
                marginRight: "auto",
                height: previewHeights.outerHeight > 0 ? `${previewHeights.outerHeight}px` : undefined,
                minHeight: previewHeights.a4Height > 0 ? `${previewHeights.a4Height}px` : undefined,
                position: "relative",
                overflow: "visible",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  width: "100%",
                  height: previewHeights.a4Height > 0 ? `${previewHeights.a4Height}px` : "100%",
                  pointerEvents: "none",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  inset: "14px",
                  height: previewHeights.a4Height > 0 ? `${Math.max(0, previewHeights.a4Height - 28)}px` : undefined,
                  border: "1px dashed rgba(100, 116, 139, 0.45)",
                  borderRadius: "10px",
                  pointerEvents: "none",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  inset: "14px",
                  display: "grid",
                  gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
                  gridAutoRows: `${GRID_ROW_PX}px`,
                  gap: 0,
                  transform: undefined,
                  transformOrigin: "top left",
                }}
                onDragOver={(event) => {
                  const sectionId = event.dataTransfer.getData("application/x-evodoc-section-id") || sectionDragIdRef.current;
                  if (!sectionId) {
                    return;
                  }
                  event.preventDefault();
                  const rect = (event.currentTarget as HTMLDivElement).getBoundingClientRect();
                  const y = Math.max(0, Math.floor((event.clientY - rect.top) / GRID_ROW_PX));
                  // Choose insertion index by comparing with section midpoints.
                  const index = sections.findIndex((section) => y < section.y + Math.floor(section.h / 2));
                  setSectionDropIndex(index === -1 ? sections.length : index);
                }}
                onDragLeave={() => setSectionDropIndex(null)}
                onDrop={(event) => {
                  const dragId = event.dataTransfer.getData("application/x-evodoc-section-id") || sectionDragIdRef.current;
                  if (!dragId) {
                    return;
                  }
                  event.preventDefault();
                  const targetIndex = sectionDropIndex ?? sections.length;
                  reorderSectionsByIndex(dragId, targetIndex);
                  setSectionDropIndex(null);
                  sectionDragIdRef.current = null;
                }}
              >
              {sectionDropIndex !== null ? (
                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: (() => {
                      if (sectionDropIndex === 0) return 0;
                      const prev = sections[Math.min(sections.length - 1, sectionDropIndex - 1)];
                      return (prev.y + prev.h + SECTION_GAP_ROWS) * GRID_ROW_PX;
                    })(),
                    height: 2,
                    background: "rgba(59, 130, 246, 0.95)",
                    boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.18)",
                    pointerEvents: "none",
                    zIndex: 10,
                  }}
                />
              ) : null}
              {showGrid ? (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    backgroundImage:
                      `linear-gradient(to right, rgba(148,163,184,0.16) 1px, transparent 1px),` +
                      `linear-gradient(to bottom, rgba(148,163,184,0.16) 1px, transparent 1px)`,
                    backgroundSize: `calc(100% / ${GRID_COLS}) ${GRID_ROW_PX}px`,
                    pointerEvents: "none",
                  }}
                />
              ) : null}

              {sections.map((block) => (
                <div
                  key={block.id}
                  style={{
                    gridColumn: `${block.x + 1} / span ${block.w}`,
                    gridRow: `${block.y + 1} / span ${block.h}`,
                    border: "1px solid rgba(59, 130, 246, 0.55)",
                    background: "rgba(59, 130, 246, 0.08)",
                    borderRadius: "10px",
                    padding: 0,
                    position: "relative",
                    overflow: "hidden",
                    display: "grid",
                    gridTemplateRows: `${GRID_ROW_PX * 2}px 1fr`,
                  }}
                >
                  <div
                    style={{
                      padding: "6px 10px",
                      borderBottom: "1px solid rgba(59, 130, 246, 0.35)",
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "0.75rem",
                      alignItems: "baseline",
                      background: "rgba(255,255,255,0.55)",
                    }}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData("application/x-evodoc-section-id", block.id);
                      event.dataTransfer.setData("text/plain", JSON.stringify({ kind: "section", id: block.id }));
                      sectionDragIdRef.current = block.id;
                    }}
                    onDragEnd={() => {
                      setSectionDropIndex(null);
                      sectionDragIdRef.current = null;
                    }}
                  >
                    <div style={{ display: "grid", gap: "2px" }}>
                      <strong style={{ fontSize: "0.86rem", color: "rgba(15,23,42,0.9)" }}>
                        {block.label} <span style={{ fontWeight: 600, color: "rgba(71,85,105,0.95)" }}>— {block.id}</span>
                      </strong>
                    </div>
                    <span className="muted-text" style={{ fontSize: "0.78rem" }}>
                      {block.w}×{block.h}
                    </span>
                  </div>
                  <div style={{ padding: 0 }}>
                    {block.id === "document_id" ? (
                      <div style={{ padding: "10px" }}>
                        <div style={{ border: "1px solid rgba(148,163,184,0.65)", padding: "8px 10px", background: "rgba(255,255,255,0.72)" }}>
                          <strong>Document ID</strong>
                        </div>
                      </div>
                    ) : (
                      <GridPreview
                        cells={block.cells}
                        allowEdit
                        dragSectionId={block.id}
                        onDropCell={(payload, next) => {
                          if (payload.kind === "add") {
                            if (!payload.fromSectionId || payload.fromSectionId !== block.id) {
                              return;
                            }
                            addAvailableFieldToSection(block.id, payload.cellId, next);
                            return;
                          }
                          if (payload.kind === "add_spacer") {
                            addSpacerToSection(block.id, next);
                            return;
                          }
                          if (payload.fromSectionId && payload.fromSectionId !== "__grid__") {
                            moveCellAcrossSections(payload.fromSectionId, block.id, payload.cellId, next);
                            return;
                          }
                          moveCellWithinSection(block.id, payload.cellId, next);
                        }}
                        onResizeCell={(cellId, next) => resizeCellWithinSection(block.id, cellId, next)}
                        onTransformCell={(cellId, next) => transformCellWithinSection(block.id, cellId, next)}
                        onDeleteCell={(cellId) => removeCellFromSection(block.id, cellId)}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
            </section>
            </div>
            {previewHeights.a4Height > 0 && previewHeights.contentHeight > previewHeights.a4Height ? (
              <section className="card" style={{ margin: 0, padding: "0.9rem", borderColor: "rgba(245, 158, 11, 0.6)" }}>
                <strong style={{ color: "#92400e" }}>Layout exceeds A4 height.</strong>
                <div className="muted-text">
                  Content is taller than one A4 page; print/export will need to scale to fit.
                </div>
              </section>
            ) : null}
          </div>

        </div>

        <div className="row-actions" style={{ marginTop: "1rem" }}>
          <Link href="/app/masters/templates">
            <button type="button" className="button-secondary">Back to Templates</button>
          </Link>
        </div>
      </section>
    </section>
  );
}

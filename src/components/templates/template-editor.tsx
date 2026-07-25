"use client";

// Shared template editor core (drag/drop/resize/available-fields) reused by all documents.
// `template-editor-page.tsx` re-exports this to preserve older imports.

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiClient } from "@/lib/api/client";
import { DEFAULT_ORG_ID } from "@/lib/config";
import {
  normalizePersistedTemplateLayout,
  normalizeTemplateCell,
  relayoutTemplateSections,
  scaleSections12To24,
  serializeTemplateLayout,
  TEMPLATE_GRID_COLS,
  type PersistedTemplateLayout,
  type TemplateGridCell,
  type TemplateSection,
} from "@/domain/template-layout";
import { applyStaticDefaultsToCell, isTemplateNoteCell } from "@/domain/template-static-content";
import { TemplateCellEditModal } from "@/components/templates/template-cell-edit-modal";
import { SaveNamedTemplateModal } from "@/components/templates/save-named-template-modal";
import { useToast } from "@/components/ui/toast";
import { useUnsavedChangesGuard } from "@/components/ui/use-unsaved-changes-guard";
import type { DocumentType, SavedDocumentTemplate } from "@/types/models";

export { TEMPLATE_GRID_COLS };
export const TEMPLATE_GRID_ROW_PX = 14;
export type { TemplateGridCell, TemplateSection } from "@/domain/template-layout";

const SECTION_HEADER_ROWS = 2;
const SECTION_BOTTOM_PADDING_ROWS = 2;
const SECTION_GAP_ROWS = 1;

type PersistedTemplate = PersistedTemplateLayout;
type DropMode = "box" | "hline" | "vline";
type DragKind = "move" | "add" | "add_spacer" | "add_spacer_borderless" | "add_note";

function relayoutSections(nextSections: TemplateSection[]) {
  return relayoutTemplateSections(nextSections);
}

function collides(a: Pick<TemplateGridCell, "x" | "y" | "w" | "h">, b: Pick<TemplateGridCell, "x" | "y" | "w" | "h">) {
  const ax2 = a.x + a.w;
  const ay2 = a.y + a.h;
  const bx2 = b.x + b.w;
  const by2 = b.y + b.h;
  return a.x < bx2 && ax2 > b.x && a.y < by2 && ay2 > b.y;
}

function dedupeById(cells: TemplateGridCell[]) {
  const seen = new Set<string>();
  const next: TemplateGridCell[] = [];
  for (const cell of cells) {
    if (seen.has(cell.id)) continue;
    seen.add(cell.id);
    next.push(cell);
  }
  return next;
}

function normalizeAvailableFields(fields: Record<string, TemplateGridCell[]>) {
  const next: Record<string, TemplateGridCell[]> = {};
  for (const [sectionId, list] of Object.entries(fields)) {
    next[sectionId] = dedupeById(list);
  }
  return next;
}

function serializeTemplate(state: PersistedTemplate) {
  return serializeTemplateLayout(state);
}

function computeSectionDropIndex(container: HTMLElement, clientY: number, sectionCount: number) {
  const sectionEls = container.querySelectorAll<HTMLElement>("[data-section-id]");
  for (let index = 0; index < sectionEls.length; index += 1) {
    const rect = sectionEls[index].getBoundingClientRect();
    if (clientY < rect.top + rect.height / 2) {
      return index;
    }
  }
  return sectionCount;
}

function readTemplate(storageKey: string): PersistedTemplate | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedTemplate;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.sections)) return null;
    return parsed;
  } catch {
    return null;
  }
}


function hydrateTemplatePayload(
  stored: PersistedTemplate,
): { sections: TemplateSection[]; availableFields: Record<string, TemplateGridCell[]>; snapshot: string; spacerCounter: number } {
  const normalized = normalizePersistedTemplateLayout(stored);
  const spacerCounter = normalized.spacerCounter ?? 1;
  const storedCols = maxTemplateCols(normalized.sections);
  const needsScale = storedCols > 0 && storedCols <= 12;
  const nextSections = needsScale ? scaleSections12To24(normalized.sections) : normalized.sections;
  const nextAvailable = normalized.availableFields ?? {};
  const scaledAvailable = needsScale
    ? Object.fromEntries(Object.entries(nextAvailable).map(([key, list]) => [key, list.map((cell) => ({ ...cell, x: cell.x * 2, w: cell.w * 2 }))]))
    : nextAvailable;
  const normalizedSections = relayoutSections(nextSections.map((section) => ({
    ...section,
    cells: section.cells.map(normalizeTemplateCell),
  })));
  const normalizedAvailable = normalizeAvailableFields(
    Object.fromEntries(Object.entries(scaledAvailable).map(([key, list]) => [key, list.map(normalizeTemplateCell)])),
  );

  return {
    sections: normalizedSections,
    availableFields: normalizedAvailable,
    snapshot: serializeTemplate({
      version: 1,
      sections: normalizedSections,
      availableFields: normalizedAvailable,
      spacerCounter,
    }),
    spacerCounter,
  };
}

function maxTemplateCols(sections: TemplateSection[]) {
  return sections.reduce((acc, section) => Math.max(acc, section.x + section.w), 0);
}

function clampCellToSection(cell: TemplateGridCell, sectionW: number) {
  const x = Math.max(0, Math.min(sectionW - 1, cell.x));
  const w = Math.max(1, Math.min(sectionW - x, cell.w));
  const y = Math.max(0, cell.y);
  const h = Math.max(1, cell.h);
  return { ...cell, x, y, w, h };
}

function compactUp(cellsInput: TemplateGridCell[]) {
  const sorted = cellsInput
    .map((cell) => ({ ...cell }))
    .sort((a, b) => (a.y - b.y) || (a.x - b.x) || a.id.localeCompare(b.id));
  const placed: TemplateGridCell[] = [];
  for (const cell of sorted) {
    let nextY = Math.max(0, cell.y);
    let guard = 0;
    while (nextY > 0 && guard < 800) {
      const candidate = { ...cell, y: nextY - 1 };
      if (placed.some((other) => collides(candidate, other))) break;
      nextY -= 1;
      guard += 1;
    }
    cell.y = nextY;
    guard = 0;
    while (placed.some((other) => collides(cell, other)) && guard < 800) {
      cell.y += 1;
      guard += 1;
    }
    placed.push(cell);
  }
  const byId = new Map(placed.map((c) => [c.id, c]));
  return cellsInput.map((c) => byId.get(c.id) ?? c);
}

function shiftToFit(cellsInput: TemplateGridCell[], pinnedId: string) {
  const pinned = cellsInput.find((c) => c.id === pinnedId);
  if (!pinned) return compactUp(cellsInput);

  const pinnedCopy = { ...pinned };
  const others = cellsInput.filter((c) => c.id !== pinnedId).map((c) => ({ ...c }));

  const placed: TemplateGridCell[] = [pinnedCopy];
  const rest = others.sort((a, b) => (a.y - b.y) || (a.x - b.x) || a.id.localeCompare(b.id));
  for (const cell of rest) {
    let guard = 0;
    while (placed.some((other) => collides(cell, other)) && guard < 800) {
      cell.y += 1;
      guard += 1;
    }
    placed.push(cell);
  }

  const byId = new Map(placed.map((c) => [c.id, c]));
  const resolved = cellsInput.map((c) => byId.get(c.id) ?? c);
  return compactUp(resolved);
}

function snapEvenRows(y: number, h: number) {
  if (h % 2 === 0) {
    return Math.max(0, y - (y % 2));
  }
  return Math.max(0, y);
}

function beginTemplateCellResize(
  event: React.PointerEvent<HTMLDivElement>,
  corner: "nw" | "se",
  cell: TemplateGridCell,
  cols: number,
  colWidth: number,
  rowHeightPx: number,
  onTransformCell: (cellId: string, next: { x: number; y: number; w: number; h: number }) => void,
) {
  event.preventDefault();
  event.stopPropagation();
  const startClientX = event.clientX;
  const startClientY = event.clientY;
  const start = { x: cell.x, y: cell.y, w: cell.w, h: cell.h };
  const target = event.currentTarget;
  target.setPointerCapture(event.pointerId);

  const onMove = (moveEvent: PointerEvent) => {
    const dx = moveEvent.clientX - startClientX;
    const dy = moveEvent.clientY - startClientY;
    const dCols = Math.round(dx / colWidth);
    const dRows = Math.round(dy / rowHeightPx);

    if (corner === "se") {
      const nextW = Math.max(1, Math.min(cols - start.x, start.w + dCols));
      const nextH = Math.max(1, start.h + dRows);
      onTransformCell(cell.id, { x: start.x, y: start.y, w: nextW, h: nextH });
      return;
    }

    let nextW = Math.max(1, start.w - dCols);
    let nextH = Math.max(1, start.h - dRows);
    let nextX = start.x + start.w - nextW;
    let nextY = start.y + start.h - nextH;
    nextX = Math.max(0, nextX);
    nextY = Math.max(0, nextY);
    nextW = Math.max(1, Math.min(cols - nextX, nextW));
    nextH = Math.max(1, nextH);
    onTransformCell(cell.id, { x: nextX, y: nextY, w: nextW, h: nextH });
  };

  const onUp = () => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
  };

  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
}

function GridPreview({
  cols,
  rowHeightPx,
  cells,
  allowEdit,
  dragSectionId,
  onDropCell,
  onTransformCell,
  onDeleteCell,
  onEditCell,
}: {
  cols: number;
  rowHeightPx: number;
  cells: TemplateGridCell[];
  allowEdit: boolean;
  dragSectionId: string;
  onDropCell: (
    payload: { kind: DragKind; cellId: string; fromSectionId?: string; dropMode: DropMode },
    next: { x: number; y: number },
  ) => void;
  onTransformCell: (cellId: string, next: { x: number; y: number; w: number; h: number }) => void;
  onDeleteCell: (cellId: string) => void;
  onEditCell: (cell: TemplateGridCell) => void;
}) {
  const [indicator, setIndicator] = useState<null | { mode: DropMode; x: number; y: number; w: number; h: number; dropX: number; dropY: number }>(null);
  const indicatorRef = useRef<typeof indicator>(null);
  const dragMetaRef = useRef<{ w: number; h: number } | null>(null);

  const maxRow = useMemo(() => cells.reduce((acc, c) => Math.max(acc, c.y + c.h), 0), [cells]);

  const readDragMeta = (event: Pick<React.DragEvent, "dataTransfer">) => {
    const payload = event.dataTransfer.getData("text/plain");
    if (payload) {
      try {
        const parsed = JSON.parse(payload) as { w?: number; h?: number };
        if (typeof parsed.w === "number" && typeof parsed.h === "number" && parsed.w > 0 && parsed.h > 0) {
          return { w: parsed.w, h: parsed.h };
        }
      } catch {
        // ignore
      }
    }
    return dragMetaRef.current ?? { w: 1, h: 1 };
  };

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    if (!allowEdit) return;
    event.preventDefault();

    const kindRaw = event.dataTransfer.getData("application/x-evodoc-cell-kind");
    const kind: DragKind | null =
      kindRaw === "add" || kindRaw === "move" || kindRaw === "add_spacer" || kindRaw === "add_spacer_borderless" || kindRaw === "add_note" ? kindRaw : null;
    const draggingId = event.dataTransfer.getData("application/x-evodoc-cell-id") || "";
    const rect = event.currentTarget.getBoundingClientRect();
    const colWidth = rect.width / cols;
    const x = Math.max(0, Math.min(cols - 1, Math.floor((event.clientX - rect.left) / colWidth)));
    const y = Math.max(0, Math.floor((event.clientY - rect.top) / rowHeightPx));
    const meta = readDragMeta(event);
    const w = Math.max(1, Math.min(cols, Math.floor(meta.w)));
    const h = Math.max(1, Math.floor(meta.h));
    const clampedX = Math.max(0, Math.min(cols - w, x));
    const candidate = { x: clampedX, y, w, h };
    const effectiveCells = kind === "move" && draggingId ? cells.filter((c) => c.id !== draggingId) : cells;

    const hit = effectiveCells.find((cell) => (
      candidate.x < cell.x + cell.w
      && candidate.x + candidate.w > cell.x
      && y >= cell.y
      && y < cell.y + cell.h
    ));

    if (!hit) {
      const next = { mode: "box" as const, x: clampedX, y, w, h, dropX: clampedX, dropY: y };
      setIndicator(next);
      indicatorRef.current = next;
      return;
    }

    const pointerRow = (event.clientY - rect.top) / rowHeightPx - hit.y;
    const pointerCol = (event.clientX - rect.left) / colWidth - hit.x;
    const edgeThreshold = Math.max(0.3, Math.min(0.45, hit.w * 0.12));
    const isNearLeft = pointerCol >= 0 && pointerCol <= edgeThreshold;
    const isNearRight = pointerCol >= hit.w - edgeThreshold && pointerCol <= hit.w;

    if (isNearLeft || isNearRight) {
      const boundaryX = isNearLeft ? hit.x : hit.x + hit.w;
      const dropX = isNearLeft ? Math.max(0, boundaryX - w) : Math.min(cols - w, boundaryX);
      const next = { mode: "vline" as const, x: boundaryX, y: hit.y, w: 1, h: hit.h, dropX, dropY: hit.y };
      setIndicator(next);
      indicatorRef.current = next;
      return;
    }

    const dropY = pointerRow < hit.h / 2 ? hit.y : hit.y + hit.h;
    const next = { mode: "hline" as const, x: hit.x, y: dropY, w: hit.w, h: 1, dropX: clampedX, dropY };
    setIndicator(next);
    indicatorRef.current = next;
  }, [allowEdit, cells, cols, rowHeightPx]);

  const onDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    if (!allowEdit) return;
    event.preventDefault();
    const cellId = event.dataTransfer.getData("application/x-evodoc-cell-id");
    if (!cellId) return;
    const kindRaw = event.dataTransfer.getData("application/x-evodoc-cell-kind");
    const kind: DragKind | null =
      kindRaw === "add" || kindRaw === "move" || kindRaw === "add_spacer" || kindRaw === "add_spacer_borderless" || kindRaw === "add_note" ? kindRaw : null;
    if (!kind) return;
    const fromSectionId = event.dataTransfer.getData("application/x-evodoc-cell-section") || undefined;

    const nextIndicator = indicatorRef.current;
    setIndicator(null);
    indicatorRef.current = null;

    const rect = event.currentTarget.getBoundingClientRect();
    const colWidth = rect.width / cols;
    const x = Math.max(0, Math.min(cols - 1, Math.floor((event.clientX - rect.left) / colWidth)));
    const y = Math.max(0, Math.floor((event.clientY - rect.top) / rowHeightPx));
    const meta = readDragMeta(event);

    if (nextIndicator) {
      const snappedY = snapEvenRows(nextIndicator.dropY, meta.h);
      onDropCell({ kind, cellId, fromSectionId, dropMode: nextIndicator.mode }, { x: nextIndicator.dropX, y: snappedY });
      return;
    }

    onDropCell({ kind, cellId, fromSectionId, dropMode: "box" }, { x, y: snapEvenRows(y, meta.h) });
  }, [allowEdit, cols, onDropCell, rowHeightPx]);

  return (
    <div
      onDragOver={onDragOver}
      onDrop={onDrop}
      style={{
        position: "relative",
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridAutoRows: `${rowHeightPx}px`,
        backgroundColor: "rgba(239, 246, 255, 0.82)",
        backgroundImage: `linear-gradient(to right, rgba(59,130,246,0.16) 1px, transparent 1px), linear-gradient(to bottom, rgba(59,130,246,0.16) 1px, transparent 1px)`,
        backgroundSize: `${100 / cols}% ${rowHeightPx}px`,
        border: "1px solid rgba(148, 163, 184, 0.6)",
        borderRadius: 10,
        overflow: "hidden",
        padding: 0,
      }}
    >
      {indicator ? (
        indicator.mode === "box" ? (
          <div
            style={{
              gridColumn: `${indicator.x + 1} / span ${indicator.w}`,
              gridRow: `${indicator.y + 1} / span ${indicator.h}`,
              border: "2px solid rgba(37,99,235,0.9)",
              background: "rgba(37,99,235,0.12)",
              pointerEvents: "none",
              zIndex: 5,
            }}
          />
        ) : indicator.mode === "hline" ? (
          <div
            style={{
              gridColumn: `${indicator.x + 1} / span ${indicator.w}`,
              gridRow: `${indicator.y + 1} / span 1`,
              height: 2,
              background: "rgba(37,99,235,0.95)",
              pointerEvents: "none",
              zIndex: 5,
              alignSelf: "start",
            }}
          />
        ) : (
          <div
            style={{
              gridColumn: `${indicator.x + 1} / span 1`,
              gridRow: `${indicator.y + 1} / span ${indicator.h}`,
              width: 2,
              background: "rgba(37,99,235,0.95)",
              pointerEvents: "none",
              zIndex: 5,
              justifySelf: "start",
            }}
          />
        )
      ) : null}

      {cells.map((cell) => (
        <div
          key={cell.id}
          draggable={allowEdit}
          onDragStart={(event) => {
            if (!allowEdit) return;
            event.dataTransfer.setData("application/x-evodoc-cell-id", cell.id);
            event.dataTransfer.setData("application/x-evodoc-cell-kind", "move");
            event.dataTransfer.setData("application/x-evodoc-cell-section", dragSectionId);
            event.dataTransfer.setData("text/plain", JSON.stringify({ id: cell.id, w: cell.w, h: cell.h }));
            dragMetaRef.current = { w: cell.w, h: cell.h };
          }}
          style={{
            gridColumn: `${cell.x + 1} / span ${cell.w}`,
            gridRow: `${cell.y + 1} / span ${cell.h}`,
            border: cell.showBorder === false ? "1px dashed rgba(148, 163, 184, 0.45)" : "1px solid rgba(148, 163, 184, 0.7)",
              background: "rgba(255,255,255,0.72)",
            padding: "6px 8px",
            fontSize: "0.74rem",
            lineHeight: 1.2,
            color: "#0f172a",
            boxSizing: "border-box",
            overflow: "hidden",
            position: "relative",
            display: "grid",
            alignContent: "center",
          }}
        >
          <strong style={{ fontWeight: 700, whiteSpace: "normal", wordBreak: "break-word" }}>{cell.label}</strong>

          {allowEdit ? (
            <>
              <button
                type="button"
                onClick={() => onEditCell(cell)}
                aria-label={`Edit ${cell.label}`}
                className="template-cell-edit-button"
              >
                ✎
              </button>
              <button
                type="button"
                onClick={() => onDeleteCell(cell.id)}
                aria-label={`Remove ${cell.label}`}
                className="template-cell-delete-button"
              >
                ×
              </button>

              {/* top-left resize handle */}
              <div
                role="presentation"
                onPointerDown={(event) => {
                  const parent = event.currentTarget.parentElement?.parentElement as HTMLElement | null;
                  const parentRect = parent?.getBoundingClientRect();
                  const colWidth = parentRect ? parentRect.width / cols : 1;
                  beginTemplateCellResize(event, "nw", cell, cols, colWidth, rowHeightPx, onTransformCell);
                }}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: 14,
                  height: 14,
                  cursor: "nwse-resize",
                  background: "transparent",
                }}
              />

              {/* bottom-right resize handle */}
              <div
                role="presentation"
                onPointerDown={(event) => {
                  const parent = event.currentTarget.parentElement?.parentElement as HTMLElement | null;
                  const parentRect = parent?.getBoundingClientRect();
                  const colWidth = parentRect ? parentRect.width / cols : 1;
                  beginTemplateCellResize(event, "se", cell, cols, colWidth, rowHeightPx, onTransformCell);
                }}
                style={{
                  position: "absolute",
                  bottom: 0,
                  right: 0,
                  width: 14,
                  height: 14,
                  cursor: "nwse-resize",
                  background: "transparent",
                }}
              />
            </>
          ) : null}
        </div>
      ))}

      {maxRow > 0 ? (
        <div style={{ gridColumn: `1 / span ${cols}`, gridRow: `${maxRow + 1} / span 1`, height: 1, opacity: 0 }} />
      ) : null}
    </div>
  );
}

function withStaticDefaults(sections: TemplateSection[]) {
  return sections.map((section) => ({
    ...section,
    cells: (section.cells ?? []).map(applyStaticDefaultsToCell),
  }));
}

export function TemplateEditor({
  storageKey,
  docType,
  title,
  subtitle,
  defaultSections12Col,
  acceptStoredTemplate,
  resetStoredTemplateMessage,
}: {
  storageKey: string;
  docType: DocumentType;
  title: string;
  subtitle: string;
  defaultSections12Col: TemplateSection[];
  acceptStoredTemplate?: (stored: PersistedTemplate) => boolean;
  resetStoredTemplateMessage?: string;
}) {
  const toast = useToast();
  const defaultBucketByCellId = useMemo(() => {
    const map = new Map<string, string>();
    for (const section of defaultSections12Col) {
      for (const cell of section.cells ?? []) {
        if (!map.has(cell.id)) {
          map.set(cell.id, section.id);
        }
      }
    }
    return map;
  }, [defaultSections12Col]);
  const [sections, setSections] = useState<TemplateSection[]>(() => relayoutSections(withStaticDefaults(scaleSections12To24(defaultSections12Col))));
  const [availableFields, setAvailableFields] = useState<Record<string, TemplateGridCell[]>>({});
  const [showGrid, setShowGrid] = useState(true);
  const spacerCounterRef = useRef(1);
  const [savedSnapshot, setSavedSnapshot] = useState("");
  const [savedTemplates, setSavedTemplates] = useState<SavedDocumentTemplate[]>([]);
  const [savedTemplatesLoading, setSavedTemplatesLoading] = useState(true);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [savingNamedTemplate, setSavingNamedTemplate] = useState(false);
  const [editingCell, setEditingCell] = useState<{ sectionId: string; cell: TemplateGridCell } | null>(null);
  const [sectionDropIndex, setSectionDropIndex] = useState<number | null>(null);
  const sectionDragIdRef = useRef<string | null>(null);
  const sectionsContainerRef = useRef<HTMLDivElement | null>(null);

  const currentSnapshot = useMemo(() => serializeTemplate({
    version: 1,
    sections,
    availableFields: normalizeAvailableFields(availableFields),
    spacerCounter: spacerCounterRef.current,
  }), [availableFields, sections]);

  const isDirty = useMemo(() => !!savedSnapshot && currentSnapshot !== savedSnapshot, [currentSnapshot, savedSnapshot]);

  useUnsavedChangesGuard({
    enabled: isDirty,
    message: "You have unsaved template changes. Save or discard them before leaving this page.",
  });

  const loadSavedTemplates = useCallback(async () => {
    setSavedTemplatesLoading(true);
    try {
      const templates = await apiClient<SavedDocumentTemplate[]>(
        `/api/templates?orgId=${DEFAULT_ORG_ID}&docType=${encodeURIComponent(docType)}`,
      );
      setSavedTemplates(templates);
    } catch {
      setSavedTemplates([]);
    } finally {
      setSavedTemplatesLoading(false);
    }
  }, [docType]);

  useEffect(() => {
    void loadSavedTemplates();
  }, [loadSavedTemplates]);

  useEffect(() => {
    const stored = readTemplate(storageKey);
    if (stored && (!acceptStoredTemplate || acceptStoredTemplate(stored))) {
      const hydrated = hydrateTemplatePayload(stored);
      spacerCounterRef.current = hydrated.spacerCounter;
      setSections(hydrated.sections);
      setAvailableFields(hydrated.availableFields);
      setSavedSnapshot(hydrated.snapshot);
    } else {
      if (stored && acceptStoredTemplate) {
        toast.info(resetStoredTemplateMessage ?? "Loaded the latest template layout.");
      }
      const baseline = serializeTemplate({
        version: 1,
        sections: relayoutSections(withStaticDefaults(scaleSections12To24(defaultSections12Col))),
        availableFields: {},
        spacerCounter: 1,
      });
      setSavedSnapshot(baseline);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateSection = useCallback((sectionId: string, updater: (section: TemplateSection) => TemplateSection) => {
    setSections((current) => relayoutSections(current.map((s) => (s.id === sectionId ? updater(s) : s))));
  }, []);

  const reorderSectionsByIndex = useCallback((dragId: string, targetIndex: number) => {
    setSections((current) => {
      const fromIndex = current.findIndex((section) => section.id === dragId);
      if (fromIndex === -1) {
        return current;
      }
      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      let insertAt = targetIndex;
      if (fromIndex < targetIndex) {
        insertAt = targetIndex - 1;
      }
      insertAt = Math.max(0, Math.min(next.length, insertAt));
      next.splice(insertAt, 0, moved);
      return relayoutSections(next);
    });
  }, []);

  const handleDropIntoSection = useCallback((sectionId: string, payload: { kind: DragKind; cellId: string; fromSectionId?: string; dropMode: DropMode }, next: { x: number; y: number }) => {
    setSections((current) => {
      const fromId = payload.fromSectionId;
      const nextSections = current.map((section) => {
        if (fromId && fromId !== sectionId && section.id === fromId) {
          return { ...section, cells: compactUp(section.cells.filter((c) => c.id !== payload.cellId)) };
        }
        if (section.id !== sectionId) return section;

        const sectionW = section.w;
        const drop = { x: Math.max(0, Math.min(sectionW - 1, next.x)), y: Math.max(0, next.y) };

        let moving: TemplateGridCell | null = null;
        if (payload.kind === "move") {
          const source = fromId ? current.find((s) => s.id === fromId) : section;
          moving = source?.cells.find((c) => c.id === payload.cellId) ?? null;
        } else if (payload.kind === "add") {
          const list = availableFields[fromId ?? sectionId] ?? [];
          moving = list.find((c) => c.id === payload.cellId) ?? null;
        } else if (payload.kind === "add_spacer") {
          moving = { id: `spacer_${spacerCounterRef.current++}`, label: "(spacer)", x: 0, y: 0, w: 6, h: 2, showBorder: true };
        } else if (payload.kind === "add_note") {
          moving = {
            id: `note_${spacerCounterRef.current++}`,
            label: "Note",
            x: 0,
            y: 0,
            w: 12,
            h: 4,
            showBorder: true,
            contentKind: "note",
            staticHtml: "<p></p>",
          };
        } else {
          moving = { id: `spacer_borderless_${spacerCounterRef.current++}`, label: "(spacer no border)", x: 0, y: 0, w: 6, h: 2, showBorder: false };
        }

        if (!moving) return section;

        const base: TemplateGridCell = clampCellToSection({ ...moving, x: drop.x, y: drop.y }, sectionW);
        const without = section.cells.filter((c) => c.id !== base.id);
        const resolved = shiftToFit([...without, base], base.id);
        return { ...section, cells: resolved };
      });
      return relayoutSections(nextSections);
    });

    if (payload.kind === "add") {
      setAvailableFields((current) => {
        // Remove from whichever bucket currently contains it (it may have been moved across sections before).
        const nextBuckets: Record<string, TemplateGridCell[]> = { ...current };
        for (const [bucketId, list] of Object.entries(nextBuckets)) {
          if (list.some((c) => c.id === payload.cellId)) {
            nextBuckets[bucketId] = list.filter((c) => c.id !== payload.cellId);
          }
        }
        return nextBuckets;
      });
    }
  }, [availableFields]);

  const handleTransformInSection = useCallback((sectionId: string, cellId: string, next: { x: number; y: number; w: number; h: number }) => {
    updateSection(sectionId, (section) => {
      const target = section.cells.find((c) => c.id === cellId);
      if (!target) return section;
      const desired = clampCellToSection({ ...target, ...next }, section.w);
      const without = section.cells.filter((c) => c.id !== cellId);
      const resolved = shiftToFit([...without, desired], desired.id);
      return { ...section, cells: resolved };
    });
  }, [updateSection]);

  const handleDeleteCell = useCallback((sectionId: string, cellId: string) => {
    updateSection(sectionId, (section) => {
      const cell = section.cells.find((c) => c.id === cellId);
      if (!cell) return section;
      const nextCells = compactUp(section.cells.filter((c) => c.id !== cellId));
      if (!cell.id.startsWith("spacer_") && !isTemplateNoteCell(cell)) {
        const homeBucket = defaultBucketByCellId.get(cell.id) ?? sectionId;
        setAvailableFields((current) => {
          const list = current[homeBucket] ?? [];
          return { ...current, [homeBucket]: dedupeById([...list, cell]) };
        });
      }
      return { ...section, cells: nextCells };
    });
  }, [defaultBucketByCellId, updateSection]);

  const saveTemplate = useCallback(() => {
    if (typeof window === "undefined") return;
    const payload: PersistedTemplate = {
      version: 1,
      sections,
      availableFields: normalizeAvailableFields(availableFields),
      spacerCounter: spacerCounterRef.current,
    };
    window.localStorage.setItem(storageKey, serializeTemplate(payload));
    setSavedSnapshot(serializeTemplate(payload));
    toast.success("Working draft saved.");
  }, [availableFields, sections, storageKey, toast]);

  const saveNamedTemplate = useCallback(async (name: string) => {
    const payload: PersistedTemplate = {
      version: 1,
      sections,
      availableFields: normalizeAvailableFields(availableFields),
      spacerCounter: spacerCounterRef.current,
    };

    setSavingNamedTemplate(true);
    try {
      await apiClient("/api/templates", {
        method: "POST",
        body: JSON.stringify({
          orgId: DEFAULT_ORG_ID,
          docType,
          name,
          layout: serializeTemplate(payload),
        }),
      });
      await loadSavedTemplates();
      setSaveTemplateOpen(false);
      toast.success(`Template "${name}" saved.`);
    } catch (saveError) {
      toast.error((saveError as Error).message || "Unable to save template.");
    } finally {
      setSavingNamedTemplate(false);
    }
  }, [availableFields, docType, loadSavedTemplates, sections, toast]);

  const loadNamedTemplate = useCallback((template: SavedDocumentTemplate) => {
    const parsed = hydrateTemplatePayload(JSON.parse(template.layout) as PersistedTemplate);
    spacerCounterRef.current = parsed.spacerCounter;
    setSections(parsed.sections);
    setAvailableFields(parsed.availableFields);
    toast.info(`Loaded template "${template.name}".`);
  }, [toast]);

  const deleteNamedTemplate = useCallback(async (templateId: string) => {
    try {
      await apiClient(`/api/templates/${templateId}?orgId=${DEFAULT_ORG_ID}`, { method: "DELETE" });
      await loadSavedTemplates();
      toast.success("Template deleted.");
    } catch (deleteError) {
      toast.error((deleteError as Error).message || "Unable to delete template.");
    }
  }, [loadSavedTemplates, toast]);

  const resetTemplate = useCallback(() => {
    spacerCounterRef.current = 1;
    setAvailableFields({});
    const defaults = withStaticDefaults(scaleSections12To24(defaultSections12Col)).map((section) => ({
      ...section,
      cells: section.cells.map((cell) => normalizeTemplateCell({
        ...cell,
        showBorder: cell.id.includes("spacer_borderless") ? false : true,
      })),
    }));
    setSections(relayoutSections(defaults));
    toast.info("Template reset to default.");
  }, [defaultSections12Col, toast]);

  const discardChanges = useCallback(() => {
    const stored = readTemplate(storageKey);
    if (stored) {
      const hydrated = hydrateTemplatePayload(stored);
      spacerCounterRef.current = hydrated.spacerCounter;
      setSections(hydrated.sections);
      setAvailableFields(hydrated.availableFields);
      setSavedSnapshot(hydrated.snapshot);
      toast.info("Discarded unsaved changes.");
      return;
    }
    resetTemplate();
    toast.info("Discarded unsaved changes.");
  }, [resetTemplate, storageKey, toast]);

  const handleSaveCellEdit = useCallback((nextCell: TemplateGridCell) => {
    if (!editingCell) {
      return;
    }

    updateSection(editingCell.sectionId, (section) => ({
      ...section,
      cells: section.cells.map((cell) => (cell.id === nextCell.id ? normalizeTemplateCell(nextCell) : cell)),
    }));
    setEditingCell(null);
  }, [editingCell, updateSection]);

  const formatSavedTemplateDate = useCallback((value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }, []);

  return (
    <section className="page-shell">
      <header className="page-header">
        <div className="row-between">
          <div>
            <h1>{title}</h1>
            <p className="muted-text">{subtitle}</p>
          </div>
          <div className="row-actions">
            <Link href="/app/masters/templates">
              <button type="button" className="secondary">Back to Templates</button>
            </Link>
            <button type="button" onClick={() => setShowGrid((v) => !v)} className="secondary">
              {showGrid ? "Hide Grid" : "Show Grid"}
            </button>
            <button type="button" onClick={resetTemplate} className="secondary">Reset Template</button>
            <button type="button" onClick={discardChanges} className="secondary" disabled={!isDirty}>Discard</button>
            <button type="button" onClick={saveTemplate} disabled={!isDirty}>Save Draft</button>
            <button type="button" onClick={() => setSaveTemplateOpen(true)}>Save Template</button>
          </div>
        </div>
      </header>

      <TemplateCellEditModal
        open={Boolean(editingCell)}
        cell={editingCell?.cell ?? null}
        onDiscard={() => setEditingCell(null)}
        onSave={handleSaveCellEdit}
      />
      <SaveNamedTemplateModal
        open={saveTemplateOpen}
        busy={savingNamedTemplate}
        onDiscard={() => {
          if (!savingNamedTemplate) {
            setSaveTemplateOpen(false);
          }
        }}
        onSave={(name) => void saveNamedTemplate(name)}
      />

      <div className="template-editor-layout">
        <aside className="template-editor-sidebar">
          <section className="card">
            <h2 style={{ marginBottom: 8 }}>Saved Templates</h2>
            <p className="muted-text" style={{ marginTop: 0 }}>
              Load a named template into the working grid, or delete templates you no longer need.
            </p>
            {savedTemplatesLoading ? (
              <p className="muted-text">Loading saved templates...</p>
            ) : savedTemplates.length === 0 ? (
              <p className="muted-text">No saved templates yet.</p>
            ) : (
              <div className="template-saved-list">
                {savedTemplates.map((template) => (
                  <div key={template.id} className="template-saved-item">
                    <div className="template-saved-item-copy">
                      <strong>{template.name}</strong>
                      <span className="muted-text">{formatSavedTemplateDate(template.createdAt)}</span>
                    </div>
                    <div className="row-actions">
                      <button type="button" className="button-secondary" onClick={() => loadNamedTemplate(template)}>
                        Load
                      </button>
                      <button type="button" className="button-secondary" onClick={() => void deleteNamedTemplate(template.id)}>
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="card">
            <h2 style={{ marginBottom: 8 }}>Available Fields</h2>
            <p className="muted-text" style={{ marginTop: 0 }}>
              Drag fields from here back into the grid after removing them.
            </p>
            <div className="template-available-fields-scroll">
              <div>
                <div className="muted-text" style={{ fontWeight: 700, marginBottom: 6 }}>Spacer</div>
                <div
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData("application/x-evodoc-cell-id", "__spacer__");
                    event.dataTransfer.setData("application/x-evodoc-cell-kind", "add_spacer");
                    event.dataTransfer.setData("application/x-evodoc-cell-section", "__available__");
                    event.dataTransfer.setData("text/plain", JSON.stringify({ w: 6, h: 2 }));
                  }}
                  style={{
                    border: "1px dashed rgba(148,163,184,0.9)",
                    borderRadius: 10,
                    padding: "8px 10px",
                    background: "rgba(255,255,255,0.8)",
                    cursor: "grab",
                    fontSize: "0.78rem",
                  }}
                >
                  (spacer)
                </div>
              </div>
              <div>
                <div className="muted-text" style={{ fontWeight: 700, marginBottom: 6 }}>Spacer — No Border</div>
                <div
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData("application/x-evodoc-cell-id", "__spacer_borderless__");
                    event.dataTransfer.setData("application/x-evodoc-cell-kind", "add_spacer_borderless");
                    event.dataTransfer.setData("application/x-evodoc-cell-section", "__available__");
                    event.dataTransfer.setData("text/plain", JSON.stringify({ w: 6, h: 2 }));
                  }}
                  style={{
                    border: "1px dashed rgba(148,163,184,0.9)",
                    borderRadius: 10,
                    padding: "8px 10px",
                    background: "rgba(239, 246, 255, 0.8)",
                    cursor: "grab",
                    fontSize: "0.78rem",
                  }}
                >
                  (spacer no border)
                </div>
              </div>
              <div>
                <div className="muted-text" style={{ fontWeight: 700, marginBottom: 6 }}>Note</div>
                <div
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData("application/x-evodoc-cell-id", "__note__");
                    event.dataTransfer.setData("application/x-evodoc-cell-kind", "add_note");
                    event.dataTransfer.setData("application/x-evodoc-cell-section", "__available__");
                    event.dataTransfer.setData("text/plain", JSON.stringify({ w: 12, h: 4 }));
                  }}
                  style={{
                    border: "1px dashed rgba(59,130,246,0.75)",
                    borderRadius: 10,
                    padding: "8px 10px",
                    background: "rgba(239, 246, 255, 0.95)",
                    cursor: "grab",
                    fontSize: "0.78rem",
                  }}
                >
                  Note (rich text)
                </div>
              </div>

              {sections.map((section) => {
                const list = availableFields[section.id] ?? [];
                if (list.length === 0) return null;
                return (
                  <div key={section.id}>
                    <div className="muted-text" style={{ fontWeight: 700, marginBottom: 6 }}>{section.label}</div>
                    <div style={{ display: "grid", gap: "0.4rem" }}>
                      {list.map((cell) => (
                        <div
                          key={`${section.id}:${cell.id}`}
                          draggable
                          onDragStart={(event) => {
                            event.dataTransfer.setData("application/x-evodoc-cell-id", cell.id);
                            event.dataTransfer.setData("application/x-evodoc-cell-kind", "add");
                            event.dataTransfer.setData("application/x-evodoc-cell-section", section.id);
                            event.dataTransfer.setData("text/plain", JSON.stringify({ w: cell.w, h: cell.h }));
                          }}
                          style={{
                            border: "1px solid rgba(148,163,184,0.75)",
                            borderRadius: 10,
                            padding: "8px 10px",
                            background: "rgba(255,255,255,0.8)",
                            cursor: "grab",
                            fontSize: "0.78rem",
                          }}
                        >
                          {cell.label}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </aside>

        <main
          style={{
            overflow: "auto",
            borderRadius: 14,
            border: "1px solid rgba(148,163,184,0.55)",
            backgroundColor: "rgba(239, 246, 255, 0.9)",
            backgroundImage: showGrid
              ? `linear-gradient(to right, rgba(59,130,246,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(59,130,246,0.08) 1px, transparent 1px)`
              : undefined,
            backgroundSize: showGrid ? `48px 48px` : undefined,
            padding: 16,
          }}
        >
          <div
            ref={sectionsContainerRef}
            style={{ display: "grid", gap: 14, minWidth: 720, position: "relative" }}
            onDragOver={(event) => {
              const sectionId = event.dataTransfer.getData("application/x-evodoc-section-id") || sectionDragIdRef.current;
              if (!sectionId || !sectionsContainerRef.current) {
                return;
              }
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
              setSectionDropIndex(computeSectionDropIndex(sectionsContainerRef.current, event.clientY, sections.length));
            }}
            onDragLeave={(event) => {
              if (!sectionsContainerRef.current?.contains(event.relatedTarget as Node | null)) {
                setSectionDropIndex(null);
              }
            }}
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
                    if (!sectionsContainerRef.current) {
                      return 0;
                    }
                    if (sectionDropIndex === 0) {
                      return 0;
                    }
                    const sectionEls = sectionsContainerRef.current.querySelectorAll<HTMLElement>("[data-section-id]");
                    const prev = sectionEls[sectionDropIndex - 1];
                    if (!prev) {
                      return 0;
                    }
                    const containerRect = sectionsContainerRef.current.getBoundingClientRect();
                    const prevRect = prev.getBoundingClientRect();
                    return prevRect.bottom - containerRect.top + 7;
                  })(),
                  height: 2,
                  background: "rgba(59, 130, 246, 0.95)",
                  boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.18)",
                  pointerEvents: "none",
                  zIndex: 10,
                }}
              />
            ) : null}
            {sections.map((section) => (
              <section
                key={section.id}
                data-section-id={section.id}
                style={{
                  borderRadius: 14,
                  border: "1px solid rgba(148,163,184,0.7)",
                  background: "rgba(239, 246, 255, 0.92)",
                  boxShadow: "0 1px 0 rgba(15,23,42,0.04)",
                  padding: 12,
                }}
              >
                <header
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData("application/x-evodoc-section-id", section.id);
                    event.dataTransfer.setData("text/plain", JSON.stringify({ kind: "section", id: section.id }));
                    event.dataTransfer.effectAllowed = "move";
                    sectionDragIdRef.current = section.id;
                  }}
                  onDragEnd={() => {
                    setSectionDropIndex(null);
                    sectionDragIdRef.current = null;
                  }}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    gap: 12,
                    flexWrap: "wrap",
                    marginBottom: 10,
                    cursor: "grab",
                    userSelect: "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "baseline", gap: 10, minWidth: 0 }}>
                    <span
                      aria-hidden
                      title="Drag to reorder section"
                      style={{
                        color: "rgba(71,85,105,0.75)",
                        fontSize: "1rem",
                        lineHeight: 1,
                        letterSpacing: "-0.08em",
                        flexShrink: 0,
                      }}
                    >
                      ⠿
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 800,
                          lineHeight: 1.15,
                          wordBreak: "break-word",
                        }}
                      >
                        {section.label}{" "}
                        <span className="muted-text" style={{ fontWeight: 600 }}>
                          — {section.id}
                        </span>
                      </div>
                      {section.description ? (
                        <div className="muted-text" style={{ fontSize: "0.82rem", marginTop: 4, maxWidth: 900 }}>
                          {section.description}
                        </div>
                      ) : null}
                      {section.id === "document_id" ? (
                        <label className="template-checkbox-row" style={{ marginTop: 8 }}>
                          <input
                            type="checkbox"
                            checked={section.showDocumentId === true}
                            onChange={(event) => updateSection(section.id, (current) => ({
                              ...current,
                              showDocumentId: event.target.checked,
                            }))}
                          />
                          <span>Show document ID in generated PDF</span>
                        </label>
                      ) : null}
                    </div>
                  </div>
                  <div className="muted-text" style={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                    {section.w}×{section.h}
                  </div>
                </header>

                <GridPreview
                  cols={section.w}
                  rowHeightPx={TEMPLATE_GRID_ROW_PX}
                  cells={section.cells}
                  allowEdit
                  dragSectionId={section.id}
                  onDropCell={(payload, next) => handleDropIntoSection(section.id, payload, next)}
                  onTransformCell={(cellId, next) => handleTransformInSection(section.id, cellId, next)}
                  onDeleteCell={(cellId) => handleDeleteCell(section.id, cellId)}
                  onEditCell={(cell) => setEditingCell({ sectionId: section.id, cell })}
                />
              </section>
            ))}
          </div>
        </main>
      </div>
    </section>
  );
}

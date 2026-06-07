"use client";

// Shared template editor core (drag/drop/resize/available-fields) reused by all documents.
// `template-editor-page.tsx` re-exports this to preserve older imports.

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { useUnsavedChangesGuard } from "@/components/ui/use-unsaved-changes-guard";

export const TEMPLATE_GRID_COLS = 24;
export const TEMPLATE_GRID_ROW_PX = 14;

const SECTION_HEADER_ROWS = 2;
const SECTION_BOTTOM_PADDING_ROWS = 2;
const SECTION_GAP_ROWS = 1;

export type TemplateGridCell = {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type TemplateSection = {
  id: string;
  label: string;
  description?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minH: number;
  cells: TemplateGridCell[];
};

type PersistedTemplate = {
  version: 1;
  sections: TemplateSection[];
  availableFields: Record<string, TemplateGridCell[]>;
  spacerCounter: number;
};

type DropMode = "box" | "hline" | "vline";
type DragKind = "move" | "add" | "add_spacer" | "add_spacer_borderless";

function collides(a: Pick<TemplateGridCell, "x" | "y" | "w" | "h">, b: Pick<TemplateGridCell, "x" | "y" | "w" | "h">) {
  const ax2 = a.x + a.w;
  const ay2 = a.y + a.h;
  const bx2 = b.x + b.w;
  const by2 = b.y + b.h;
  return a.x < bx2 && ax2 > b.x && a.y < by2 && ay2 > b.y;
}

function computeSectionHeight(section: TemplateSection) {
  const maxContentRow = section.cells.reduce((acc, cell) => Math.max(acc, cell.y + cell.h), 0);
  const computed = SECTION_HEADER_ROWS + maxContentRow + SECTION_BOTTOM_PADDING_ROWS;
  const structuralMin = SECTION_HEADER_ROWS + SECTION_BOTTOM_PADDING_ROWS + 1;
  return Math.max(structuralMin, computed, section.minH);
}

function relayoutSections(nextSections: TemplateSection[]) {
  let cursorY = 0;
  const updated: TemplateSection[] = [];
  for (const section of nextSections) {
    const h = computeSectionHeight(section);
    updated.push({ ...section, y: cursorY, h });
    cursorY += h + SECTION_GAP_ROWS;
  }
  return updated;
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
  return JSON.stringify(state);
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

function savedDesignStorageKey(storageKey: string) {
  return `${storageKey}.__saved_design`;
}

function hydrateTemplatePayload(
  stored: PersistedTemplate,
): { sections: TemplateSection[]; availableFields: Record<string, TemplateGridCell[]>; snapshot: string; spacerCounter: number } {
  const spacerCounter = stored.spacerCounter ?? 1;
  const storedCols = maxTemplateCols(stored.sections);
  const needsScale = storedCols > 0 && storedCols <= 12;
  const nextSections = needsScale ? scaleSections12To24(stored.sections) : stored.sections;
  const nextAvailable = stored.availableFields ?? {};
  const scaledAvailable = needsScale
    ? Object.fromEntries(Object.entries(nextAvailable).map(([key, list]) => [key, list.map((cell) => ({ ...cell, x: cell.x * 2, w: cell.w * 2 }))]))
    : nextAvailable;
  const normalizedSections = relayoutSections(nextSections);
  const normalizedAvailable = normalizeAvailableFields(scaledAvailable);

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

function scaleSections12To24(sections12: TemplateSection[]): TemplateSection[] {
  return sections12.map((section) => ({
    ...section,
    x: section.x * 2,
    w: section.w * 2,
    cells: (section.cells ?? []).map((cell) => ({
      ...cell,
      x: cell.x * 2,
      w: cell.w * 2,
    })),
  }));
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

function GridPreview({
  cols,
  rowHeightPx,
  cells,
  allowEdit,
  dragSectionId,
  onDropCell,
  onTransformCell,
  onDeleteCell,
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
      kindRaw === "add" || kindRaw === "move" || kindRaw === "add_spacer" || kindRaw === "add_spacer_borderless" ? kindRaw : null;
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
      kindRaw === "add" || kindRaw === "move" || kindRaw === "add_spacer" || kindRaw === "add_spacer_borderless" ? kindRaw : null;
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
            border: "1px solid rgba(148, 163, 184, 0.7)",
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
                onClick={() => onDeleteCell(cell.id)}
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

              {/* top-left invisible resize */}
              <div
                role="presentation"
                onPointerDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  const startClientX = event.clientX;
                  const startClientY = event.clientY;
                  const start = { x: cell.x, y: cell.y, w: cell.w, h: cell.h };
                  const target = event.currentTarget as HTMLElement;
                  target.setPointerCapture(event.pointerId);
                  const parent = target.parentElement as HTMLElement | null;
                  const parentRect = parent?.getBoundingClientRect();
                  const colWidth = parentRect ? parentRect.width / cols : 1;

                  const onMove = (moveEvent: PointerEvent) => {
                    const dx = moveEvent.clientX - startClientX;
                    const dy = moveEvent.clientY - startClientY;
                    const dCols = Math.round(dx / colWidth);
                    const dRows = Math.round(dy / rowHeightPx);
                    const nextX = Math.max(0, Math.min(cols - 1, start.x + dCols));
                    const nextY = Math.max(0, start.y + dRows);
                    const nextW = Math.max(1, Math.min(cols - nextX, start.w - dCols));
                    const nextH = Math.max(1, start.h - dRows);
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
                  top: 0,
                  left: 0,
                  width: 14,
                  height: 14,
                  cursor: "nwse-resize",
                }}
              />

              {/* bottom-right resize handle */}
              <div
                role="presentation"
                onPointerDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  const startClientX = event.clientX;
                  const startClientY = event.clientY;
                  const start = { w: cell.w, h: cell.h };
                  const target = event.currentTarget as HTMLElement;
                  target.setPointerCapture(event.pointerId);
                  const parent = target.parentElement?.parentElement as HTMLElement | null;
                  const parentRect = parent?.getBoundingClientRect();
                  const colWidth = parentRect ? parentRect.width / cols : 1;

                  const onMove = (moveEvent: PointerEvent) => {
                    const dx = moveEvent.clientX - startClientX;
                    const dy = moveEvent.clientY - startClientY;
                    const dCols = Math.round(dx / colWidth);
                    const dRows = Math.round(dy / rowHeightPx);
                    const nextW = Math.max(1, start.w + dCols);
                    const nextH = Math.max(1, start.h + dRows);
                    onTransformCell(cell.id, { x: cell.x, y: cell.y, w: nextW, h: nextH });
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

export function TemplateEditor({
  storageKey,
  title,
  subtitle,
  defaultSections12Col,
}: {
  storageKey: string;
  title: string;
  subtitle: string;
  defaultSections12Col: TemplateSection[];
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
  const [sections, setSections] = useState<TemplateSection[]>(() => relayoutSections(scaleSections12To24(defaultSections12Col)));
  const [availableFields, setAvailableFields] = useState<Record<string, TemplateGridCell[]>>({});
  const [showGrid, setShowGrid] = useState(true);
  const spacerCounterRef = useRef(1);
  const [savedSnapshot, setSavedSnapshot] = useState("");
  const [savedDesignSnapshot, setSavedDesignSnapshot] = useState("");

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

  useEffect(() => {
    const stored = readTemplate(storageKey);
    if (stored) {
      const hydrated = hydrateTemplatePayload(stored);
      spacerCounterRef.current = hydrated.spacerCounter;
      setSections(hydrated.sections);
      setAvailableFields(hydrated.availableFields);
      setSavedSnapshot(hydrated.snapshot);
    } else {
      const baseline = serializeTemplate({
        version: 1,
        sections: relayoutSections(scaleSections12To24(defaultSections12Col)),
        availableFields: {},
        spacerCounter: 1,
      });
      setSavedSnapshot(baseline);
    }

    const storedDesign = readTemplate(savedDesignStorageKey(storageKey));
    if (storedDesign) {
      setSavedDesignSnapshot(hydrateTemplatePayload(storedDesign).snapshot);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateSection = useCallback((sectionId: string, updater: (section: TemplateSection) => TemplateSection) => {
    setSections((current) => relayoutSections(current.map((s) => (s.id === sectionId ? updater(s) : s))));
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
          moving = { id: `spacer_${spacerCounterRef.current++}`, label: "(spacer)", x: 0, y: 0, w: 6, h: 2 };
        } else {
          moving = { id: `spacer_borderless_${spacerCounterRef.current++}`, label: "(spacer no border)", x: 0, y: 0, w: 6, h: 2 };
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
      if (!cell.id.startsWith("spacer_")) {
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
    toast.success("Template saved.");
  }, [availableFields, sections, storageKey, toast]);

  const saveTemplateDesign = useCallback(() => {
    if (typeof window === "undefined") return;
    const payload: PersistedTemplate = {
      version: 1,
      sections,
      availableFields: normalizeAvailableFields(availableFields),
      spacerCounter: spacerCounterRef.current,
    };
    const snapshot = serializeTemplate(payload);
    window.localStorage.setItem(savedDesignStorageKey(storageKey), snapshot);
    setSavedDesignSnapshot(snapshot);
    toast.success("Template design saved.");
  }, [availableFields, sections, storageKey, toast]);

  const resetTemplate = useCallback(() => {
    spacerCounterRef.current = 1;
    setAvailableFields({});
    setSections(relayoutSections(scaleSections12To24(defaultSections12Col)));
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

  const loadSavedTemplateDesign = useCallback(() => {
    const storedDesign = readTemplate(savedDesignStorageKey(storageKey));
    if (!storedDesign) {
      toast.error("No saved template design found.");
      return;
    }
    const hydrated = hydrateTemplatePayload(storedDesign);
    spacerCounterRef.current = hydrated.spacerCounter;
    setSections(hydrated.sections);
    setAvailableFields(hydrated.availableFields);
    setSavedDesignSnapshot(hydrated.snapshot);
    toast.info("Loaded saved template design.");
  }, [storageKey, toast]);

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
            <button type="button" onClick={loadSavedTemplateDesign} className="secondary" disabled={!savedDesignSnapshot}>
              Load Saved Design
            </button>
            <button type="button" onClick={saveTemplateDesign} className="secondary">
              Save Design
            </button>
            <button type="button" onClick={resetTemplate} className="secondary">Reset Template</button>
            <button type="button" onClick={discardChanges} className="secondary" disabled={!isDirty}>Discard</button>
            <button type="button" onClick={saveTemplate} disabled={!isDirty}>Save</button>
          </div>
        </div>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: "1rem", alignItems: "start" }}>
        <aside style={{ position: "sticky", top: 16, alignSelf: "start" }}>
          <section className="card">
            <h2 style={{ marginBottom: 8 }}>Available Fields</h2>
            <p className="muted-text" style={{ marginTop: 0 }}>
              Drag fields from here back into the grid after removing them.
            </p>
            <div style={{ display: "grid", gap: "0.75rem" }}>
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
          <div style={{ display: "grid", gap: 14, minWidth: 720 }}>
            {sections.map((section) => (
              <section
                key={section.id}
                style={{
                  borderRadius: 14,
                  border: "1px solid rgba(148,163,184,0.7)",
                  background: "rgba(239, 246, 255, 0.92)",
                  boxShadow: "0 1px 0 rgba(15,23,42,0.04)",
                  padding: 12,
                }}
              >
                <header
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    gap: 12,
                    flexWrap: "wrap",
                    marginBottom: 10,
                  }}
                >
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
                />
              </section>
            ))}
          </div>
        </main>
      </div>
    </section>
  );
}

import type { DocumentType } from "@/types/models";

export type TemplateGridCell = {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  showBorder?: boolean;
  contentKind?: "field" | "static";
  staticHtml?: string;
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

export type PersistedTemplateLayout = {
  version: 1;
  sections: TemplateSection[];
  availableFields: Record<string, TemplateGridCell[]>;
  spacerCounter: number;
};

export function isTemplateSpacerCell(cell: Pick<TemplateGridCell, "id" | "label">) {
  return cell.label === "(spacer)"
    || cell.label === "(spacer no border)"
    || cell.id.includes("spacer");
}

export function isTemplateBorderlessCell(cell: Pick<TemplateGridCell, "id" | "label" | "showBorder">) {
  if (cell.showBorder === false) {
    return true;
  }

  return cell.label === "(spacer no border)" || cell.id.includes("spacer_borderless");
}

export function normalizeTemplateCell(cell: TemplateGridCell): TemplateGridCell {
  const showBorder = cell.showBorder ?? !isTemplateBorderlessCell({ ...cell, showBorder: undefined });
  return {
    ...cell,
    showBorder,
  };
}

export function normalizeTemplateSections(sections: TemplateSection[]): TemplateSection[] {
  return sections.map((section) => ({
    ...section,
    cells: (section.cells ?? []).map(normalizeTemplateCell),
  }));
}

export function normalizePersistedTemplateLayout(layout: PersistedTemplateLayout): PersistedTemplateLayout {
  const availableFields: Record<string, TemplateGridCell[]> = {};
  for (const [key, cells] of Object.entries(layout.availableFields ?? {})) {
    availableFields[key] = cells.map(normalizeTemplateCell);
  }

  return {
    version: 1,
    sections: normalizeTemplateSections(layout.sections ?? []),
    availableFields,
    spacerCounter: layout.spacerCounter ?? 1,
  };
}

export function serializeTemplateLayout(layout: PersistedTemplateLayout): string {
  return JSON.stringify(normalizePersistedTemplateLayout(layout));
}

export function parseTemplateLayout(raw: string | undefined | null): PersistedTemplateLayout | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as PersistedTemplateLayout;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.sections)) {
      return null;
    }

    return normalizePersistedTemplateLayout(parsed);
  } catch {
    return null;
  }
}

export function docTypeForTemplateStorageKey(storageKey: string): DocumentType | null {
  const mapping: Record<string, DocumentType> = {
    "evodoc.templates.commercial_invoice_icc.v1": "invoice",
    "evodoc.templates.packing_list_icc.v1": "packing_list",
    "evodoc.templates.shipping_instructions.v1": "shipping_instructions",
    "evodoc.templates.quality_certificate.v1": "quality_certificate",
    "evodoc.templates.weight_certificate.v1": "weight_certificate",
    "evodoc.templates.way_bill.v1": "way_bill",
    "evodoc.templates.ico_certificate.v1": "ico_certificate",
    "evodoc.templates.bill_of_lading.v1": "bill_of_lading",
  };

  return mapping[storageKey] ?? null;
}

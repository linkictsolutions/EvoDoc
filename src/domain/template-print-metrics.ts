import type { CSSProperties } from "react";
import { TEMPLATE_GRID_ROW_PX, type TemplateVerticalAlign } from "@/domain/template-layout";

export { TEMPLATE_GRID_ROW_PX };

export function templateCellHeightPx(heightInRows?: number): number {
  return Math.max(1, heightInRows ?? 1) * TEMPLATE_GRID_ROW_PX;
}

export function templateCellHeightStyle(cell: {
  h?: number;
  verticalAlign?: TemplateVerticalAlign;
}): CSSProperties {
  const heightPx = templateCellHeightPx(cell.h);
  let verticalAlign: CSSProperties["verticalAlign"] = "top";

  if (cell.verticalAlign === "middle") {
    verticalAlign = "middle";
  } else if (cell.verticalAlign === "bottom") {
    verticalAlign = "bottom";
  }

  return {
    minHeight: `${heightPx}px`,
    verticalAlign,
  };
}

export function templateCellBlockHeightStyle(cell: {
  h?: number;
  verticalAlign?: TemplateVerticalAlign;
}): CSSProperties {
  const heightPx = templateCellHeightPx(cell.h);
  return {
    ...templateCellHeightStyle(cell),
    height: `${heightPx}px`,
  };
}

export function templateTableRowStyle(): CSSProperties {
  return {
    height: `${TEMPLATE_GRID_ROW_PX}px`,
  };
}

export function maxTemplateCellHeightStyle(...cells: Array<{ h?: number; verticalAlign?: TemplateVerticalAlign }>): CSSProperties {
  const tallest = cells.reduce((max, cell) => Math.max(max, cell.h ?? 1), 1);
  const verticalAlign = cells.find((cell) => cell.verticalAlign)?.verticalAlign;
  return templateCellHeightStyle({ h: tallest, verticalAlign });
}

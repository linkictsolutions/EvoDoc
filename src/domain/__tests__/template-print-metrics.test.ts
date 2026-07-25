import { templateCellHeightPx, templateCellHeightStyle } from "@/domain/template-print-metrics";

describe("template-print-metrics", () => {
  it("scales cell height by template row units", () => {
    expect(templateCellHeightPx(4)).toBe(56);
    expect(templateCellHeightStyle({ h: 4 }).minHeight).toBe("56px");
  });
});

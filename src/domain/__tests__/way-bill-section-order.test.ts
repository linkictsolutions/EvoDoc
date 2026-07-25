import { sortWayBillSections } from "@/domain/way-bill-template";
import type { TemplateSection } from "@/domain/template-layout";

function section(id: string, y = 0): TemplateSection {
  return {
    id,
    label: id,
    x: 0,
    y,
    w: 24,
    h: 8,
    minH: 8,
    cells: [],
  };
}

describe("sortWayBillSections", () => {
  it("uses canonical order when all sections share the same y", () => {
    const sorted = sortWayBillSections([
      section("conditions"),
      section("header_meta"),
      section("transport"),
      section("declaration"),
      section("goods"),
    ]);

    expect(sorted.map((entry) => entry.id)).toEqual([
      "header_meta",
      "transport",
      "declaration",
      "conditions",
      "goods",
    ]);
  });

  it("prefers explicit y positions from relayout", () => {
    const sorted = sortWayBillSections([
      section("footer", 40),
      section("header_meta", 0),
      section("transport", 10),
    ]);

    expect(sorted.map((entry) => entry.id)).toEqual([
      "header_meta",
      "transport",
      "footer",
    ]);
  });
});

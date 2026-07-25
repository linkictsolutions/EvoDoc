import { isCurrentWayBillTemplate } from "@/domain/way-bill-template-validation";
import type { PersistedTemplateLayout } from "@/domain/template-layout";

describe("way-bill-template-validation", () => {
  it("rejects legacy single-column templates", () => {
    const legacy = {
      version: 1,
      sections: [
        {
          id: "transport",
          label: "Transport",
          x: 0,
          y: 0,
          w: 24,
          h: 20,
          minH: 20,
          cells: [{ id: "wb_to", label: "To", x: 0, y: 0, w: 24, h: 2 }],
        },
      ],
      availableFields: {},
      spacerCounter: 1,
    } satisfies PersistedTemplateLayout;

    expect(isCurrentWayBillTemplate(legacy)).toBe(false);
  });

  it("accepts two-column templates with required sections", () => {
    const current = {
      version: 1,
      sections: [
        {
          id: "transport",
          label: "Transport",
          x: 0,
          y: 0,
          w: 24,
          h: 20,
          minH: 20,
          cells: [
            { id: "wb_lbl_to", label: "To:", x: 0, y: 0, w: 8, h: 2 },
            { id: "wb_to", label: "To", x: 8, y: 0, w: 16, h: 2 },
          ],
        },
        { id: "declaration", label: "Declaration", x: 0, y: 0, w: 24, h: 8, minH: 8, cells: [] },
        { id: "conditions", label: "Conditions", x: 0, y: 0, w: 24, h: 8, minH: 8, cells: [] },
        { id: "goods", label: "Goods", x: 0, y: 0, w: 24, h: 8, minH: 8, cells: [] },
      ],
      availableFields: {},
      spacerCounter: 1,
    } satisfies PersistedTemplateLayout;

    expect(isCurrentWayBillTemplate(current)).toBe(true);
  });
});

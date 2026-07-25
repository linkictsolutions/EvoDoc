import { resolveWayBillCellValue, resolveWayBillFooterValue } from "@/domain/way-bill-template";

describe("way-bill-template", () => {
  const rows = [
    { label: "Driver Name", value: "John Doe" },
    { label: "Terms Intro", value: "According to the following terms and conditions." },
  ];

  it("resolves footer driver value from driver name", () => {
    expect(resolveWayBillFooterValue(rows, {
      id: "wb_footer_driver",
      label: "Driver Name",
      x: 0,
      y: 0,
      w: 12,
      h: 2,
    })).toBe("John Doe");
  });

  it("resolves mapped field values", () => {
    expect(resolveWayBillCellValue(rows, {
      id: "wb_driver",
      label: "Driver Name",
      x: 0,
      y: 0,
      w: 12,
      h: 2,
    })).toBe("John Doe");
  });
});

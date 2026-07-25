import { resolveWayBillCellValue, resolveWayBillFooterRow } from "@/domain/way-bill-template";

describe("way-bill-template", () => {
  const rows = [
    { label: "Driver Name Label", value: "Driver name:" },
    { label: "Driver Name", value: "John Doe" },
    { label: "Driver Signature Label", value: "Signature:" },
    { label: "Dispatch Signature Label", value: "Signature:" },
    { label: "Terms Intro", value: "According to the following terms and conditions." },
  ];

  it("maps footer rows to label/value pairs", () => {
    expect(resolveWayBillFooterRow(rows, "wb_footer_driver_name")).toEqual({
      label: "Driver name:",
      value: "John Doe",
    });
  });

  it("resolves mapped field values", () => {
    expect(resolveWayBillCellValue(rows, {
      id: "wb_terms_intro",
      label: "Terms Intro",
      x: 0,
      y: 0,
      w: 12,
      h: 2,
    })).toBe("According to the following terms and conditions.");
  });
});

import { describe, expect, it } from "vitest";
import { computeBookingLineNetWeight, computeShipmentTotals } from "@/domain/shipments";

describe("shipments", () => {
  it("computes line net weight", () => {
    expect(
      computeBookingLineNetWeight({
        lineNo: 1,
        bags: 10,
        grossWeightKg: 100,
        tareWeightKg: 5,
      }),
    ).toBe(95);
  });

  it("computes shipment totals", () => {
    const totals = computeShipmentTotals([
      { lineNo: 1, bags: 10, grossWeightKg: 100, tareWeightKg: 5 },
      { lineNo: 2, bags: 20, grossWeightKg: 200, tareWeightKg: 8 },
    ]);

    expect(totals.totalBags).toBe(30);
    expect(totals.totalGrossWeightKg).toBe(300);
    expect(totals.totalTareWeightKg).toBe(13);
    expect(totals.totalNetWeightKg).toBe(287);
  });
});

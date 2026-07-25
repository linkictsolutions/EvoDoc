import { buildTypeOfShipmentSummary, resolveDefaultContainerType } from "@/domain/type-of-shipment";
import type { BookingsSheet } from "@/types/models";

describe("type-of-shipment", () => {
  it("groups containers by configured type", () => {
    const bookings = {
      entries: [
        { rowNo: 1, vehicleType: "TRUCK", containerNumber: "C1", containerType: "20FT (FCL)" },
        { rowNo: 2, vehicleType: "TRUCK", containerNumber: "C2", containerType: "20FT (FCL)" },
        { rowNo: 3, vehicleType: "TRUCK", containerNumber: "C3", containerType: "40FT (FCL)" },
        { rowNo: 4, vehicleType: "TRUCK", containerNumber: "C4", containerType: "40FT (FCL)" },
      ],
    } as BookingsSheet;

    expect(buildTypeOfShipmentSummary({
      bookings,
      containerTypes: ["20FT (FCL)", "40FT (FCL)"],
    })).toBe("2 X 20FT (FCL), 2 X 40FT (FCL)");
  });

  it("falls back to parity container count when no booking containers exist", () => {
    expect(buildTypeOfShipmentSummary({
      fallbackContainerCount: 4,
      containerTypes: ["20FT (FCL)"],
    })).toBe("4 X 20FT (FCL)");
  });

  it("uses the first configured container type as default", () => {
    expect(resolveDefaultContainerType(["40FT (FCL)", "20FT (FCL)"])).toBe("40FT (FCL)");
    expect(resolveDefaultContainerType([])).toBe("20FT (FCL)");
  });
});

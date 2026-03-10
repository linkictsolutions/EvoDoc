import { shipmentInputSchema } from "@/domain/schemas";
import { roundWeight, sum } from "@/domain/rounding";
import type { BookingLine, ShipmentTotals } from "@/types/models";

export function computeBookingLineNetWeight(line: BookingLine): number {
  return roundWeight(line.grossWeightKg - line.tareWeightKg);
}

export function computeShipmentTotals(lines: BookingLine[]): ShipmentTotals {
  const totalBags = lines.reduce((acc, line) => acc + line.bags, 0);
  const totalGrossWeightKg = roundWeight(sum(lines.map((line) => line.grossWeightKg)));
  const totalTareWeightKg = roundWeight(sum(lines.map((line) => line.tareWeightKg)));
  const totalNetWeightKg = roundWeight(totalGrossWeightKg - totalTareWeightKg);

  return {
    totalBags,
    totalGrossWeightKg,
    totalTareWeightKg,
    totalNetWeightKg,
  };
}

export function normalizeShipmentPayload(input: unknown) {
  const parsed = shipmentInputSchema.parse(input);
  const bookingLines = parsed.shipment.bookingLines.map((line) => ({
    ...line,
    netWeightKg: computeBookingLineNetWeight(line),
  }));

  return {
    ...parsed,
    shipment: {
      ...parsed.shipment,
      bookingLines,
      totals: computeShipmentTotals(bookingLines),
    },
  };
}

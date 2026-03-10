import { describe, expect, it } from "vitest";
import { buildInvoiceOutput } from "@/domain/documents/invoice";
import type { DocumentInputSnapshot } from "@/types/models";

const snapshot: DocumentInputSnapshot<"invoice"> = {
  docType: "invoice",
  contract: {
    id: "c1",
    orgId: "o1",
    contractNumber: "CN-1",
    customerId: "cust-1",
    status: "draft",
    createdBy: "u1",
    createdAt: "2026-03-03T00:00:00.000Z",
    updatedAt: "2026-03-03T00:00:00.000Z",
    terms: {
      quality: "Specialty",
      origin: "Ethiopia",
      grade: "G1",
      quantityBags: 10,
      bagWeightKg: 60,
      unitPrice: 154,
      currency: "USD",
      packagingUnit: "Bag of 60Kg",
      priceUnitForPrice: 100,
      paymentTerm: "CAD",
      deliveryTerm: "F.O.B",
      cropYear: "2025/26",
    },
    shipping: {
      destinationPort: "Hamburg",
      shippingLine: "Maersk",
      portOfLoading: "Djibouti",
      bookingNumber: "BK-100",
      bagMarkings: "PRAXIS/G1",
    },
    banking: {
      beneficiaryBank: "ABC Bank",
      accountNumber: "12345",
    },
    processing: {
      stationName: "Station 1",
      stationAddress: "Address 1",
      moisturePercent: 11,
    },
  },
  customer: {
    id: "cust-1",
    orgId: "o1",
    name: "Buyer",
    address: "Buyer Address",
    country: "DE",
    createdAt: "2026-03-03T00:00:00.000Z",
    updatedAt: "2026-03-03T00:00:00.000Z",
  },
  shipment: {
    id: "s1",
    orgId: "o1",
    contractId: "c1",
    status: "draft",
    bookingLines: [],
    totals: {
      totalBags: 10,
      totalGrossWeightKg: 610,
      totalTareWeightKg: 10,
      totalNetWeightKg: 600,
    },
    createdAt: "2026-03-03T00:00:00.000Z",
    updatedAt: "2026-03-03T00:00:00.000Z",
  },
};

describe("invoice mapper", () => {
  it("builds invoice output snapshot", () => {
    const output = buildInvoiceOutput(snapshot);
    expect(output.title).toBe("Commercial Invoice");
    expect(output.totals.totalBags).toBe("10");
    expect(output.totals.totalAmount).toContain("$2,037.07");
    expect(output.sections[1].rows.find((row) => row.label === "Payment Term")?.value).toBe("CAD");
  });
});

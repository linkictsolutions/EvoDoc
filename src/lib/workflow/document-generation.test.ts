import { describe, expect, it } from "vitest";
import { makeGeneratedDocumentPayload } from "@/lib/workflow/document-generation";
import type { DocumentInputSnapshot, DocumentOutputSnapshot } from "@/types/models";

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
      lastCertNo: 22,
    },
    shipping: {
      destinationPort: "Hamburg",
      shippingLine: "Maersk",
      portOfLoading: "Djibouti",
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
    status: "ready",
    bookingLines: [],
    totals: {
      totalBags: 10,
      totalGrossWeightKg: 607.5,
      totalTareWeightKg: 7.5,
      totalNetWeightKg: 600,
    },
    createdAt: "2026-03-03T00:00:00.000Z",
    updatedAt: "2026-03-03T00:00:00.000Z",
  },
};

const outputSnapshot: DocumentOutputSnapshot<"invoice"> = {
  docType: "invoice",
  title: "Commercial Invoice",
  sections: [{ heading: "A", rows: [{ label: "x", value: "y" }] }],
  totals: { total: "1" },
};

describe("document payload hashing", () => {
  it("creates stable snapshot hash", () => {
    const first = makeGeneratedDocumentPayload({
      docType: "invoice",
      docVariant: "final",
      templateVersion: "v1",
      inputSnapshot: snapshot,
      outputSnapshot,
      shipmentId: "s1",
      generatedBy: "u1",
      revisionNumber: 1,
    });

    const second = makeGeneratedDocumentPayload({
      docType: "invoice",
      docVariant: "final",
      templateVersion: "v1",
      inputSnapshot: snapshot,
      outputSnapshot,
      shipmentId: "s1",
      generatedBy: "u1",
      revisionNumber: 1,
    });

    expect(first.snapshotHash).toHaveLength(64);
    expect(first.snapshotHash).toBe(second.snapshotHash);
  });
});

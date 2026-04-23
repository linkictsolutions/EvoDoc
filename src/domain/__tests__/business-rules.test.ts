import { describe, expect, it } from "vitest";
import {
  validateContractBusinessRules,
  validateDocumentGenerationRules,
  validateShipmentBusinessRules,
} from "@/domain/business-rules";
import type { Contract, DocumentInputSnapshot, Shipment } from "@/types/models";

function makeContract(): Contract {
  return {
    id: "c1",
    orgId: "o1",
    contractNumber: "CN-001",
    customerId: "cust-1",
    status: "draft",
    createdBy: "u1",
    createdAt: "2026-03-03T00:00:00.000Z",
    updatedAt: "2026-03-03T00:00:00.000Z",
    terms: {
      quality: "UNWASHED DJIMMAH",
      origin: "ETHIOPIA",
      grade: "G1",
      quantityBags: 320,
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
      destinationPort: "HAMBURG, GERMANY",
      shippingLine: "MAERSK",
      portOfLoading: "DJIBOUTI",
      bagMarkings: "PRAXIS/G1",
      consignee: "ACME",
      notifyParty: "ACME LOGISTICS",
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
  };
}

function makeShipment(): Shipment {
  return {
    id: "s1",
    orgId: "o1",
    contractId: "c1",
    status: "ready",
    bookingLines: [
      {
        lineNo: 1,
        bags: 320,
        grossWeightKg: 19440,
        tareWeightKg: 240,
        netWeightKg: 19200,
      },
    ],
    totals: {
      totalBags: 320,
      totalGrossWeightKg: 19440,
      totalTareWeightKg: 240,
      totalNetWeightKg: 19200,
    },
    createdAt: "2026-03-03T00:00:00.000Z",
    updatedAt: "2026-03-03T00:00:00.000Z",
  };
}

describe("business rules", () => {
  it("passes contract rules for valid contract", () => {
    const result = validateContractBusinessRules(makeContract());
    expect(result.errors).toHaveLength(0);
  });

  it("fails shipment when gross weight is below tare", () => {
    const shipment = makeShipment();
    shipment.bookingLines[0].grossWeightKg = 100;
    shipment.bookingLines[0].tareWeightKg = 200;

    const result = validateShipmentBusinessRules(shipment, makeContract());
    expect(result.errors.join(" ")).toContain("gross weight below tare weight");
  });

  it("returns warning for draft shipment document generation", () => {
    const shipment = makeShipment();
    shipment.status = "draft";

    const snapshot: DocumentInputSnapshot<"invoice"> = {
      docType: "invoice",
      contract: makeContract(),
      customer: {
        id: "cust-1",
        orgId: "o1",
        name: "Buyer",
        address: "Buyer Address",
        country: "DE",
        createdAt: "2026-03-03T00:00:00.000Z",
        updatedAt: "2026-03-03T00:00:00.000Z",
      },
      shipment,
    };

    const result = validateDocumentGenerationRules(snapshot);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings.join(" ")).toContain("Shipment is still in draft status");
  });
});

import { describe, expect, it } from "vitest";
import {
  computeContractExcelParity,
  generateCertificateRange,
  resolveContractSiLcFinalFields,
} from "@/domain/excel-parity";
import type { DocumentInputSnapshot } from "@/types/models";

describe("excel parity contract formulas", () => {
  it("matches core contract formulas for Bag of 60Kg", () => {
    const parity = computeContractExcelParity({
      quality: "UNWASHED DJIMMAH",
      origin: "UNWASHED DJIMMAH",
      grade: "FIVE(5)",
      quantityBags: 10,
      bagWeightKg: 60,
      unitPrice: 154,
      currency: "USD",
      packagingUnit: "Bag of 60Kg",
      priceUnitForPrice: 100,
    });

    expect(parity.quantityKg).toBe(600);
    expect(parity.quantityLb).toBe(1322.772);
    expect(parity.totalPrice).toBe(2037.07);
    expect(parity.quantityMt).toBe(0.6);
    expect(parity.containerCount).toBe(1);
  });

  it("supports Metric Ton quantity conversion", () => {
    const parity = computeContractExcelParity({
      quality: "Specialty",
      origin: "Ethiopia",
      grade: "G1",
      quantityBags: 2,
      bagWeightKg: 60,
      unitPrice: 154,
      currency: "USD",
      packagingUnit: "Metric Ton",
      priceUnitForPrice: 100,
    });

    expect(parity.quantityKg).toBe(2000);
    expect(parity.quantityMt).toBe(2);
    expect(parity.containerCount).toBe(1);
  });

  it("generates certificate ranges like workbook sequence logic", () => {
    expect(generateCertificateRange(22, 1)).toBe("0023");
    expect(generateCertificateRange(22, 4)).toBe("0023-0026");
  });
});

describe("excel parity final field resolution", () => {
  it("resolves final fields with contract/shipping defaults", () => {
    const snapshot: DocumentInputSnapshot<"invoice"> = {
      docType: "invoice",
      contract: {
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
          quantityBags: 10,
          bagWeightKg: 60,
          unitPrice: 154,
          currency: "USD",
          packagingUnit: "Bag of 60Kg",
          priceUnitForPrice: 100,
          paymentTerm: "CAD",
          deliveryTerm: "F.O.B",
          cropYear: "2025/26",
          lastCertNo: 22,
        },
        shipping: {
          destinationPort: "HAMBURG, GERMANY",
          shippingLine: "MAERSK",
          portOfLoading: "DJIBOUTI",
          bagMarkings: "PRAXIS/G1",
          consignee: "ACME COFFEE GmbH",
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
          totalGrossWeightKg: 607.5,
          totalTareWeightKg: 7.5,
          totalNetWeightKg: 600,
        },
        createdAt: "2026-03-03T00:00:00.000Z",
        updatedAt: "2026-03-03T00:00:00.000Z",
      },
    };

    const parity = computeContractExcelParity(snapshot.contract.terms);
    const finalFields = resolveContractSiLcFinalFields(snapshot, parity);

    expect(finalFields.destination).toBe("HAMBURG, GERMANY");
    expect(finalFields.portOfLoading).toBe("DJIBOUTI");
    expect(finalFields.paymentTerm).toBe("CAD");
    expect(finalFields.bagMarking).toBe("PRAXIS/G1");
    expect(finalFields.certNo).toBe("0023");
    expect(finalFields.description).toContain("AS PER CONTRACT REF.CN-001");
  });
});

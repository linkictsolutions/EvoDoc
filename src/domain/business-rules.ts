import { computeContractExcelParity } from "@/domain/excel-parity";
import type { Contract, DocumentInputSnapshot, Shipment } from "@/types/models";

export interface BusinessRuleResult {
  errors: string[];
  warnings: string[];
}

export class BusinessRuleError extends Error {
  constructor(
    message: string,
    public readonly issues: string[],
  ) {
    super(message);
  }
}

function makeResult(): BusinessRuleResult {
  return { errors: [], warnings: [] };
}

function isCurrencyCode(value: string): boolean {
  return /^[A-Z]{3}$/.test(value.trim());
}

function near(a: number, b: number, tolerance = 0.001): boolean {
  return Math.abs(a - b) <= tolerance;
}

function expectedBagWeight(unit: string): number | null {
  const normalized = unit.trim().toLowerCase();
  if (normalized === "bag of 60kg") return 60;
  if (normalized === "bag of 50kg") return 50;
  if (normalized === "bag of 30kg") return 30;
  return null;
}

export function validateContractBusinessRules(contract: Contract): BusinessRuleResult {
  const result = makeResult();

  if (contract.terms.quantityBags <= 0) {
    result.errors.push("Contract quantity must be greater than zero.");
  }

  if (contract.terms.unitPrice <= 0) {
    result.errors.push("Unit price must be greater than zero.");
  }

  if (!isCurrencyCode(contract.terms.currency)) {
    result.warnings.push("Currency is not an ISO-4217 style code (expected format like USD).");
  }

  if (contract.processing.moisturePercent > 20) {
    result.errors.push("Moisture percentage is above allowed threshold (20%).");
  }

  const bagWeight = expectedBagWeight(contract.terms.packagingUnit);
  if (bagWeight !== null && !near(contract.terms.bagWeightKg, bagWeight, 0.01)) {
    result.warnings.push(
      `Packaging unit ${contract.terms.packagingUnit} normally implies bag weight ${bagWeight}kg, but ${contract.terms.bagWeightKg}kg was provided.`,
    );
  }

  const paymentTerm = (contract.terms.paymentTerm ?? "").trim();
  if (!paymentTerm) {
    result.warnings.push("Payment term is empty.");
  }

  return result;
}

export function validateShipmentBusinessRules(
  shipment: Shipment,
  contract?: Contract,
): BusinessRuleResult {
  const result = makeResult();

  if (shipment.bookingLines.length === 0) {
    result.errors.push("Shipment must include at least one booking line.");
  }

  shipment.bookingLines.forEach((line, idx) => {
    if (line.grossWeightKg < line.tareWeightKg) {
      result.errors.push(
        `Booking line ${idx + 1} has gross weight below tare weight (${line.grossWeightKg} < ${line.tareWeightKg}).`,
      );
    }

    if (line.bags <= 0) {
      result.warnings.push(`Booking line ${idx + 1} has zero bags.`);
    }
  });

  if (shipment.totals.totalNetWeightKg <= 0) {
    result.errors.push("Shipment net weight must be positive.");
  }

  if (contract) {
    const parity = computeContractExcelParity(contract.terms);

    const qtyDeviation =
      parity.quantityKg === 0
        ? 0
        : Math.abs(shipment.totals.totalNetWeightKg - parity.quantityKg) / parity.quantityKg;

    if (qtyDeviation > 0.2) {
      result.errors.push(
        `Shipment net weight deviates too much from contract quantity (${(qtyDeviation * 100).toFixed(2)}%).`,
      );
    } else if (qtyDeviation > 0.05) {
      result.warnings.push(
        `Shipment net weight differs from contract quantity by ${(qtyDeviation * 100).toFixed(2)}%.`,
      );
    }

    const bagDeviation =
      contract.terms.quantityBags === 0
        ? 0
        : Math.abs(shipment.totals.totalBags - contract.terms.quantityBags) / contract.terms.quantityBags;

    if (bagDeviation > 0.2) {
      result.errors.push(
        `Shipment bag count deviates too much from contract quantity (${(bagDeviation * 100).toFixed(2)}%).`,
      );
    } else if (bagDeviation > 0.05) {
      result.warnings.push(
        `Shipment bag count differs from contract by ${(bagDeviation * 100).toFixed(2)}%.`,
      );
    }
  }

  return result;
}

export function validateDocumentGenerationRules(
  snapshot: DocumentInputSnapshot,
): BusinessRuleResult {
  const result = makeResult();
  const allowPartialSourceData =
    snapshot.docType === "invoice"
    || snapshot.docType === "quality_certificate"
    || snapshot.docType === "weight_certificate"
    || snapshot.docType === "way_bill";

  if (snapshot.contract.status === "closed") {
    result.errors.push("Cannot generate document for a closed contract.");
  }

  if (!allowPartialSourceData && snapshot.shipment.totals.totalNetWeightKg < 0) {
    result.errors.push("Cannot generate document with negative net shipment weight.");
  } else if (!allowPartialSourceData && snapshot.shipment.totals.totalNetWeightKg === 0) {
    result.warnings.push("Net shipment weight is zero; generated document may have incomplete execution values.");
  }

  if (!snapshot.customer.name.trim()) {
    result.errors.push("Customer name is required for document generation.");
  }

  if (!allowPartialSourceData && !snapshot.contract.shipping.destinationPort.trim()) {
    result.errors.push("Destination port is required for document generation.");
  }

  if (!allowPartialSourceData && snapshot.shipment.status === "draft") {
    result.warnings.push("Shipment is still in draft status during document generation.");
  }

  if (snapshot.docType === "quality_certificate") {
    const preparedContainers = snapshot.executionData?.staffing?.finalRows
      ?.filter((row) => row.containerNumber && row.containerNumber.trim() !== "")
      .length ?? 0;

    if (preparedContainers === 0) {
      result.warnings.push("No prepared staffing containers found; Certificate of Quality container table will be empty.");
    }

    if (typeof snapshot.executionData?.processing?.moisturePercent !== "number") {
      result.warnings.push("Processing moisture is missing; moisture content field may be blank.");
    }
  }

  if (snapshot.docType === "weight_certificate") {
    const preparedContainers = snapshot.executionData?.staffing?.finalRows
      ?.filter((row) => row.containerNumber && row.containerNumber.trim() !== "")
      .length ?? 0;

    if (preparedContainers === 0) {
      result.warnings.push("No prepared staffing containers found; Certificate of Weight container table will be empty.");
    }
  }

  if (snapshot.docType === "way_bill") {
    const driverRows = snapshot.executionData?.staffing?.finalRows
      ?.filter((row) => (row.driverName && row.driverName.trim() !== "") || (row.plateNo && row.plateNo.trim() !== ""))
      .length ?? 0;

    if (driverRows === 0) {
      result.warnings.push("No driver/truck rows found in staffing; Way Bill tabs will be empty.");
    }
  }

  const contractRules = validateContractBusinessRules(snapshot.contract);
  result.errors.push(...contractRules.errors);
  result.warnings.push(...contractRules.warnings);

  return result;
}

export function assertNoBusinessRuleErrors(result: BusinessRuleResult): void {
  if (result.errors.length > 0) {
    throw new BusinessRuleError("Business rule validation failed.", result.errors);
  }
}

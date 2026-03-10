import Decimal from "decimal.js";
import { roundMoney, roundWeight } from "@/domain/rounding";
import type { ContractTerms, DocumentInputSnapshot } from "@/types/models";

const BULK_REFERENCE_KG = 19200;
const KG_TO_LB = 2.20462;
const BAG_TARE_WEIGHT_KG_60 = 0.75;

function normalizeUnit(unit: string): string {
  return unit.trim().toLowerCase();
}

function divideSafe(value: Decimal, by: Decimal.Value): Decimal {
  const denominator = new Decimal(by);
  if (denominator.equals(0)) {
    return new Decimal(0);
  }
  return value.div(denominator);
}

function resolveQuantityKg(terms: ContractTerms): Decimal {
  const quantity = new Decimal(terms.quantityBags);
  const unit = normalizeUnit(terms.packagingUnit);

  if (unit === "kg") {
    return quantity;
  }

  if (unit === "bag of 60kg") {
    return quantity.mul(60);
  }

  if (unit === "bag of 50kg") {
    return quantity.mul(50);
  }

  if (unit === "bag of 30kg") {
    return quantity.mul(30);
  }

  if (unit === "lbs" || unit === "lb") {
    return quantity.div(2.2046);
  }

  if (unit === "metric ton" || unit === "mt") {
    return quantity.mul(1000);
  }

  if (unit === "bulk") {
    return quantity.mul(BULK_REFERENCE_KG);
  }

  // Fallback for free-form values.
  return quantity.mul(terms.bagWeightKg);
}

function resolveNoOfBags(terms: ContractTerms, quantityKg: Decimal): Decimal {
  const unit = normalizeUnit(terms.packagingUnit);

  if (unit === "bag of 60kg" || unit === "bag of 50kg" || unit === "bag of 30kg") {
    return new Decimal(terms.quantityBags);
  }

  return quantityKg.div(60).toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
}

export interface ContractExcelParity {
  totalPrice: number;
  quantityKg: number;
  quantityLb: number;
  quantityMt: number;
  grossWeightKg: number;
  grossWeightMt: number;
  quantityBag60: number;
  quantityBag50: number;
  quantityBag30: number;
  unitPriceBag60: number;
  unitPriceBag50: number;
  unitPriceBag30: number;
  containerCount: number;
  noOfBags: number;
}

export function computeContractExcelParity(terms: ContractTerms): ContractExcelParity {
  const quantityKg = resolveQuantityKg(terms);
  const quantityLb = quantityKg.mul(KG_TO_LB);

  const priceUnitForPrice = terms.priceUnitForPrice ?? 100;
  const totalPrice = divideSafe(new Decimal(terms.unitPrice), priceUnitForPrice).mul(quantityLb);

  const quantityBag60 = divideSafe(quantityKg, 60);
  const quantityBag50 = divideSafe(quantityKg, 50);
  const quantityBag30 = divideSafe(quantityKg, 30);

  const grossWeightKg = quantityKg.plus(quantityBag60.mul(BAG_TARE_WEIGHT_KG_60));
  const quantityMt = divideSafe(quantityKg, 1000);
  const grossWeightMt = divideSafe(grossWeightKg, 1000);

  const containerCount = Math.max(1, divideSafe(quantityKg, BULK_REFERENCE_KG).ceil().toNumber());
  const noOfBags = resolveNoOfBags(terms, quantityKg);

  return {
    totalPrice: roundMoney(totalPrice),
    quantityKg: roundWeight(quantityKg),
    quantityLb: roundWeight(quantityLb),
    quantityMt: roundWeight(quantityMt),
    grossWeightKg: roundWeight(grossWeightKg),
    grossWeightMt: roundWeight(grossWeightMt),
    quantityBag60: roundWeight(quantityBag60),
    quantityBag50: roundWeight(quantityBag50),
    quantityBag30: roundWeight(quantityBag30),
    unitPriceBag60: roundMoney(divideSafe(totalPrice, quantityBag60)),
    unitPriceBag50: roundMoney(divideSafe(totalPrice, quantityBag50)),
    unitPriceBag30: roundMoney(divideSafe(totalPrice, quantityBag30)),
    containerCount,
    noOfBags: roundWeight(noOfBags),
  };
}

export interface ResolvedFinalFields {
  quality: string;
  buyerName: string;
  buyerAddress: string;
  uomPacking: string;
  quantityContract: string;
  totalPrice: string;
  origin: string;
  grade: string;
  shipmentPeriod: string;
  paymentTerm: string;
  deliveryTerm: string;
  certNo: string;
  destination: string;
  shippingLine: string;
  alternative1: string;
  alternative2: string;
  portOfLoading: string;
  noOfBags: string;
  bagMarking: string;
  description: string;
  consignee: string;
  notify: string;
  applicant: string;
  secondNotify: string;
  cropYear: string;
}

function padCert(value: number): string {
  return value.toString().padStart(4, "0");
}

export function generateCertificateRange(lastCertNo: number, containerCount: number): string {
  const start = Math.max(1, lastCertNo + 1);
  const end = start + Math.max(1, containerCount) - 1;

  if (start === end) {
    return padCert(start);
  }

  return `${padCert(start)}-${padCert(end)}`;
}

function pickFinalValue(...candidates: Array<string | undefined>): string {
  for (const candidate of candidates) {
    if (candidate && candidate.trim() !== "") {
      return candidate.trim();
    }
  }

  return "-";
}

function deriveDescription(snapshot: DocumentInputSnapshot, cropYear: string): string {
  return [
    "ETHIOPIAN COFFEE, UNWASHED ARABICA",
    snapshot.contract.terms.origin,
    `GRADE ${snapshot.contract.terms.grade}`,
    `CROP YEAR ${cropYear}`,
    `AS PER CONTRACT REF.${snapshot.contract.contractNumber}`,
  ].join(", ");
}

export function resolveContractSiLcFinalFields(
  snapshot: DocumentInputSnapshot,
  parity: ContractExcelParity,
): ResolvedFinalFields {
  const cropYear =
    snapshot.contract.terms.cropYear?.trim() || String(new Date().getUTCFullYear());

  const contractSource = {
    quality: snapshot.contract.terms.quality,
    buyerName: snapshot.customer.name,
    buyerAddress: snapshot.customer.address,
    uomPacking: snapshot.contract.terms.packagingUnit,
    quantityContract: String(snapshot.contract.terms.quantityBags),
    totalPrice: String(parity.totalPrice),
    origin: snapshot.contract.terms.origin,
    grade: snapshot.contract.terms.grade,
    shipmentPeriod: snapshot.contract.terms.shipmentPeriod,
    paymentTerm: snapshot.contract.terms.paymentTerm,
    deliveryTerm: snapshot.contract.terms.deliveryTerm,
    certNo: generateCertificateRange(snapshot.contract.terms.lastCertNo ?? 0, parity.containerCount),
  };

  const shippingSource = {
    quality: snapshot.contract.shipping.qualityValue,
    uomPacking: snapshot.contract.shipping.packagingValue,
    quantityContract: snapshot.contract.shipping.quantityValue,
    shipmentPeriod: snapshot.contract.shipping.shipmentMonth,
    destination: snapshot.contract.shipping.destinationPort,
    shippingLine: snapshot.contract.shipping.shippingLine,
    alternative1: snapshot.contract.shipping.alternative1,
    alternative2: snapshot.contract.shipping.alternative2,
    portOfLoading: snapshot.contract.shipping.portOfLoading,
    noOfBags: snapshot.contract.shipping.noOfBagsValue ?? String(parity.noOfBags),
    bagMarking: snapshot.contract.shipping.bagMarkings,
    description: snapshot.contract.shipping.description ?? deriveDescription(snapshot, cropYear),
    consignee:
      snapshot.contract.shipping.consignee ?? `${snapshot.customer.name}, ${snapshot.customer.address}`,
    notify: snapshot.contract.shipping.notifyParty,
    secondNotify: snapshot.contract.shipping.secondNotify,
    applicant:
      snapshot.contract.shipping.notifyParty ?? `${snapshot.customer.name}, ${snapshot.customer.address}`,
  };

  const lcSource = {
    totalPrice: snapshot.contract.banking.currencyAmount,
    destination: snapshot.contract.banking.portOfDischarge,
    portOfLoading: snapshot.contract.banking.portOfLoading,
    noOfBags: snapshot.contract.banking.noOfBags,
    description: snapshot.contract.banking.goodsDescription,
    consignee: snapshot.contract.banking.consignee,
    notify: snapshot.contract.banking.notify,
    secondNotify: snapshot.contract.banking.secondNotify,
    applicant: snapshot.contract.banking.notify,
  };

  const revisedShippingSource = {
    consignee: snapshot.contract.shipping.revisedConsignee,
    notify: snapshot.contract.shipping.revisedNotifyParty,
    secondNotify: snapshot.contract.shipping.revisedSecondNotify,
  };

  const revisedLcSource = {
    consignee: snapshot.contract.banking.revisedConsignee,
    notify: snapshot.contract.banking.revisedNotify,
    secondNotify: snapshot.contract.banking.revisedSecondNotify,
    applicant: snapshot.contract.banking.revisedNotify,
  };

  return {
    quality: pickFinalValue(shippingSource.quality, contractSource.quality),
    buyerName: pickFinalValue(contractSource.buyerName),
    buyerAddress: pickFinalValue(contractSource.buyerAddress),
    uomPacking: pickFinalValue(shippingSource.uomPacking, contractSource.uomPacking),
    quantityContract: pickFinalValue(shippingSource.quantityContract, contractSource.quantityContract),
    totalPrice: pickFinalValue(lcSource.totalPrice, contractSource.totalPrice),
    origin: pickFinalValue(contractSource.origin),
    grade: pickFinalValue(contractSource.grade),
    shipmentPeriod: pickFinalValue(shippingSource.shipmentPeriod, contractSource.shipmentPeriod),
    paymentTerm: pickFinalValue(contractSource.paymentTerm),
    deliveryTerm: pickFinalValue(contractSource.deliveryTerm),
    certNo: pickFinalValue(contractSource.certNo),
    destination: pickFinalValue(lcSource.destination, shippingSource.destination),
    shippingLine: pickFinalValue(shippingSource.shippingLine),
    alternative1: pickFinalValue(shippingSource.alternative1),
    alternative2: pickFinalValue(shippingSource.alternative2),
    portOfLoading: pickFinalValue(lcSource.portOfLoading, shippingSource.portOfLoading),
    noOfBags: pickFinalValue(lcSource.noOfBags, shippingSource.noOfBags),
    bagMarking: pickFinalValue(shippingSource.bagMarking),
    description: pickFinalValue(lcSource.description, shippingSource.description, deriveDescription(snapshot, cropYear)),
    consignee: pickFinalValue(
      revisedLcSource.consignee,
      lcSource.consignee,
      revisedShippingSource.consignee,
      shippingSource.consignee,
    ),
    notify: pickFinalValue(
      revisedLcSource.notify,
      lcSource.notify,
      revisedShippingSource.notify,
      shippingSource.notify,
    ),
    applicant: pickFinalValue(
      revisedLcSource.applicant,
      lcSource.applicant,
      shippingSource.applicant,
    ),
    secondNotify: pickFinalValue(
      revisedLcSource.secondNotify,
      lcSource.secondNotify,
      revisedShippingSource.secondNotify,
      shippingSource.secondNotify,
    ),
    cropYear,
  };
}

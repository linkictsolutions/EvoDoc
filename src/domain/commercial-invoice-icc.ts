import { amountToWords } from "@/domain/amount-words";
import { resolveCompanyConfiguration } from "@/domain/company-configuration";
import { buildContractSiLcReport } from "@/domain/contract-si-lc";
import { computeContractExcelParity } from "@/domain/excel-parity";
import type { BookingsSheet, CompanyConfiguration, Contract, Customer, Shipment } from "@/types/models";

interface InvoiceRow {
  rowNumber: number;
  contractValue: string;
  finalValue: string;
}

function clean(value: string | number | undefined | null): string {
  if (value === undefined || value === null) {
    return "";
  }

  const normalized = String(value).trim();
  if (normalized === "-" || normalized === "0") {
    return "";
  }

  return normalized;
}

function formatDate(value: string | undefined): string {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toLocaleDateString("en-GB");
}

function parseAmount(value: string): number | null {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/,/g, "").replace(/[^0-9.-]/g, "");
  if (!normalized || normalized === "-" || normalized === ".") {
    return null;
  }

  const numeric = Number(normalized);
  if (!Number.isFinite(numeric)) {
    return null;
  }

  return numeric;
}

function findRow(rows: InvoiceRow[], rowNumber: number) {
  return rows.find((row) => row.rowNumber === rowNumber);
}

function resolveFromK(rows: InvoiceRow[], rowNumber: number): string {
  return clean(findRow(rows, rowNumber)?.finalValue);
}

function resolveFromF(rows: InvoiceRow[], rowNumber: number): string {
  return clean(findRow(rows, rowNumber)?.contractValue);
}

function vesselVoyage(shipment?: Shipment): string {
  if (!shipment) {
    return "";
  }

  const vessel = clean(shipment.vessel);
  const voyage = clean(shipment.voyageNo);
  if (vessel && voyage) {
    return `${vessel} , ${voyage}`;
  }

  return vessel || voyage;
}

export interface CommercialInvoiceIccSample {
  contractId: string;
  contractNumber: string;
  header: {
    date: string;
    refNo: string;
    salesContractRef: string;
    salesContractDate: string;
    exporterBeneficiarySeller: string;
    bankPermitNumber: string;
    billOfLadingNumber: string;
    methodOfDispatch: string;
    vesselAndVoyageNumber: string;
    shippedOnBoardDate: string;
    applicantNotify: string;
    consignee: string;
    eccsaCertificateOfOriginNumber: string;
  };
  goodsLine: {
    descriptionOfGoods: string;
    hsCode: string;
    quantityLbNet: string;
    quantityKgNet: string;
    quantityKgGross: string;
    packagesInBags: string;
    unitPriceUscPerLb: string;
    totalPriceUsd: string;
    totalAmountUsd: string;
    amountInWords: string;
  };
  bank: {
    bankOfBeneficiary: string;
    beneficiaryBankAddress: string;
    swiftNumber: string;
    beneficiaryName: string;
    beneficiaryAccountNumber: string;
    correspondentBankName: string;
    correspondentBankAddress: string;
    correspondentSwiftNumber: string;
    correspondentAccountNumber: string;
  };
  footer: {
    countryOfOrigin: string;
    placeOfIssue: string;
    portOfLoading: string;
    portOfDischarge: string;
    finalDestination: string;
    dateOfIssue: string;
    deliveryTradeTerm: string;
    typeOfShipment: string;
    incoterm: string;
    termMethodOfPayment: string;
    packagingAndMarkingLabel: string;
    fullMarking: string;
  };
  mappingNotes: string[];
}

export function buildCommercialInvoiceIccSample(
  contract: Contract,
  customer: Customer,
  latestShipment?: Shipment,
  companyConfigurationInput?: Partial<CompanyConfiguration> | null,
  bookings?: BookingsSheet,
): CommercialInvoiceIccSample {
  const companyConfiguration = resolveCompanyConfiguration(contract.orgId, companyConfigurationInput);
  const parity = computeContractExcelParity(contract.terms, companyConfiguration);
  const report = buildContractSiLcReport(contract, customer);
  const rowAmount = resolveFromK(report.rows, 12);
  const parsedRowAmount = parseAmount(rowAmount);
  const totalAmount = parsedRowAmount ?? parity.totalPrice;
  const sellerLine = `${companyConfiguration.sellerName}, ${companyConfiguration.sellerAddress}`;

  const paymentTerm = resolveFromK(report.rows, 16) || clean(contract.terms.paymentTerm);
  const deliveryTerm = resolveFromK(report.rows, 17) || clean(contract.terms.deliveryTerm);
  const portOfLoading = resolveFromK(report.rows, 24);
  const destination = resolveFromK(report.rows, 20);
  const noOfBags = resolveFromK(report.rows, 25);
  const bagMarking = resolveFromK(report.rows, 27);
  const description = resolveFromK(report.rows, 28);
  const consignee = resolveFromK(report.rows, 29);
  const applicantNotify = resolveFromK(report.rows, 30);
  const packagingAndMarking = resolveFromF(report.rows, 35);

  const contractDate = formatDate(contract.createdAt);
  const today = formatDate(new Date().toISOString());
  const containerCount = Number.isFinite(parity.containerCount) ? parity.containerCount : 0;
  const typeOfShipment = `${Math.max(0, containerCount)} X 20FT (FCL)`;

  return {
    contractId: contract.id,
    contractNumber: contract.contractNumber,
    header: {
      date: today,
      refNo: contract.contractNumber,
      salesContractRef: contract.contractNumber,
      salesContractDate: contractDate,
      exporterBeneficiarySeller: sellerLine,
      bankPermitNumber: clean(contract.banking.permitNumber),
      billOfLadingNumber: clean(bookings?.billOfLadingNumber) || clean(latestShipment?.bookingReference) || clean(contract.shipping.bookingNumber),
      methodOfDispatch: "VESSEL",
      vesselAndVoyageNumber: [clean(bookings?.vesselName), clean(bookings?.voyageNo)].filter(Boolean).join(" , ") || vesselVoyage(latestShipment),
      shippedOnBoardDate: clean(contract.banking.latestShipmentDate),
      applicantNotify,
      consignee,
      eccsaCertificateOfOriginNumber: "N/A",
    },
    goodsLine: {
      descriptionOfGoods: description,
      hsCode: companyConfiguration.defaultHsCode,
      quantityLbNet: parity.quantityLb.toFixed(2),
      quantityKgNet: parity.quantityKg.toFixed(2),
      quantityKgGross: parity.grossWeightKg.toFixed(2),
      packagesInBags: noOfBags,
      unitPriceUscPerLb: Number(contract.terms.unitPrice).toFixed(2),
      totalPriceUsd: totalAmount.toFixed(2),
      totalAmountUsd: totalAmount.toFixed(2),
      amountInWords: amountToWords(totalAmount, "USD"),
    },
    bank: {
      bankOfBeneficiary: clean(contract.banking.beneficiaryBank),
      beneficiaryBankAddress: clean(contract.banking.bankAddress),
      swiftNumber: clean(contract.banking.receiver),
      beneficiaryName: companyConfiguration.sellerName,
      beneficiaryAccountNumber: clean(contract.banking.beneficiaryAccountNumber),
      correspondentBankName: clean(contract.banking.correspondentBank),
      correspondentBankAddress: clean(contract.banking.bankAddress),
      correspondentSwiftNumber: clean(contract.banking.swiftCode),
      correspondentAccountNumber: clean(contract.banking.accountNumber),
    },
    footer: {
      countryOfOrigin: companyConfiguration.defaultOrigin,
      placeOfIssue: companyConfiguration.placeOfIssue,
      portOfLoading,
      portOfDischarge: destination,
      finalDestination: destination,
      dateOfIssue: today,
      deliveryTradeTerm: deliveryTerm,
      typeOfShipment,
      incoterm: deliveryTerm,
      termMethodOfPayment: paymentTerm,
      packagingAndMarkingLabel: packagingAndMarking,
      fullMarking: bagMarking,
    },
    mappingNotes: [
      "Contract-SI-LC final precedence is applied (Revised LC > LC > Revised SI > SI > Contract).",
      "Commercial Invoice(ICC) sample uses row K values for final fields and row F35 for Packaging & Marking label, matching the workbook formulas.",
      "Workbook-level seller, HS code, and place-of-issue values come from Company Configuration.",
      "Bookings-derived fields are mapped from the latest saved shipment (vessel, voyage, booking reference) when available.",
    ],
  };
}

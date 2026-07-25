import { amountToWords } from "@/domain/amount-words";
import { resolveCompanyConfiguration } from "@/domain/company-configuration";
import { buildContractSiLcReport } from "@/domain/contract-si-lc";
import { formatDateOfShipment } from "@/domain/date-format";
import { computeContractExcelParity, generateCertificateRange } from "@/domain/excel-parity";
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

function formatNumber(value: number, digits = 2): string {
  if (!Number.isFinite(value)) {
    return "";
  }

  return value.toFixed(digits);
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
    dateOfShipment: string;
    certNumbers: string;
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

  const contractDate = formatDateOfShipment(contract.createdAt);
  const today = formatDateOfShipment(new Date().toISOString());
  const dateOfShipment = formatDateOfShipment(
    contract.terms.shipmentPeriod
    || contract.shipping.shipmentMonth
    || contract.banking.latestShipmentDate,
  );
  const certNumbers = generateCertificateRange(contract.terms.lastCertNo ?? 0, parity.containerCount);
  const containerCount = Number.isFinite(parity.containerCount) ? parity.containerCount : 0;
  const typeOfShipment = `${Math.max(0, containerCount)} X 20FT (FCL)`;
  const billOfLadingNumber = clean(bookings?.billOfLadingNumber) || clean(latestShipment?.bookingReference) || clean(contract.shipping.bookingNumber);
  const vesselAndVoyageNumber = [clean(bookings?.vesselName), clean(bookings?.voyageNo)].filter(Boolean).join(" , ") || vesselVoyage(latestShipment);
  const documentRefNo = clean(contract.documentRefs?.commercial_invoice);

  return {
    contractId: contract.id,
    contractNumber: contract.contractNumber,
    header: {
      date: today,
      refNo: documentRefNo,
      salesContractRef: contract.contractNumber,
      salesContractDate: contractDate,
      exporterBeneficiarySeller: sellerLine,
      bankPermitNumber: clean(contract.banking.permitNumber),
      billOfLadingNumber,
      methodOfDispatch: "VESSEL",
      vesselAndVoyageNumber,
      shippedOnBoardDate: clean(contract.banking.latestShipmentDate),
      applicantNotify,
      consignee,
      eccsaCertificateOfOriginNumber: "N/A",
      dateOfShipment,
      certNumbers,
    },
    goodsLine: {
      descriptionOfGoods: description,
      hsCode: companyConfiguration.defaultHsCode,
      quantityLbNet: formatNumber(parity.quantityLb, 4),
      quantityKgNet: formatNumber(parity.quantityKg),
      quantityKgGross: formatNumber(parity.grossWeightKg),
      packagesInBags: noOfBags,
      unitPriceUscPerLb: Number(contract.terms.unitPrice).toFixed(2),
      totalPriceUsd: totalAmount.toFixed(2),
      totalAmountUsd: totalAmount.toFixed(2),
      amountInWords: amountToWords(totalAmount, "USD"),
    },
    bank: {
      bankOfBeneficiary: clean(contract.banking.beneficiaryBank),
      beneficiaryBankAddress: clean(contract.banking.bankAddress),
      swiftNumber: clean(contract.banking.beneficiarySwiftCode ?? contract.banking.swiftCode),
      beneficiaryName: companyConfiguration.sellerName,
      beneficiaryAccountNumber: clean(contract.banking.beneficiaryAccountNumber),
      correspondentBankName: clean(contract.banking.correspondentBank),
      correspondentBankAddress: clean(contract.banking.correspondentBankAddress ?? contract.banking.receiver),
      correspondentSwiftNumber: clean(contract.banking.correspondentSwiftCode),
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
      "Commercial Invoice(ICC) uses formulas from sheet12 in Coffee Doc-Praxis-V2.xlsm.",
      "Key links: I11=Contract!C5, I12=Contract!C7, I13=concat(Form Configuration seller+address), C14=Bank & LC!H5, I15=Bookings!B43, I18=Contract-SI-LC!K30, C22=Contract-SI-LC!K29.",
      "Goods row links: C28=K28, D28=Form Configuration!D16, F28=Contract!D28, H28=Contract!D26, L28=Contract!H26, M28=K25, O28=Contract!D16, P28=K12, C30=NumberToWords(P29).",
      "Footer links: C40=Form Configuration!K7, C41=K24, C42/C43=K20, C44=K17, C47=K16, C49=F35, C51=K27.",
    ],
  };
}

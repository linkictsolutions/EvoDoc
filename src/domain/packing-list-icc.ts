import { resolveCompanyConfiguration } from "@/domain/company-configuration";
import { buildContractSiLcReport } from "@/domain/contract-si-lc";
import { computeContractExcelParity, type ResolvedFinalFields } from "@/domain/excel-parity";
import { buildTypeOfShipmentSummary } from "@/domain/type-of-shipment";
import { combineVehicleField, vehicleGroupsWithContainers } from "@/domain/vehicle-container-groups";
import type {
  BookingsSheet,
  CompanyConfiguration,
  Contract,
  Customer,
  ProcessingSheet,
  StaffingFinalRow,
} from "@/types/models";

interface PackingListIccContainerLine {
  containerNumber: string;
  sealNumber: string;
  packages: string;
  netWeightKgs: string;
  grossWeightKgs: string;
}

export interface PackingListIccSample {
  contractId: string;
  contractNumber: string;
  header: {
    date: string;
    salesContractRef: string;
    refNo: string;
    salesContractDate: string;
    exporterBeneficiarySeller: string;
    bankPermitNumber: string;
    applicantNotify: string;
    billOfLadingNumber: string;
    shippingLine: string;
    vesselName: string;
    voyageNo: string;
    consignee: string;
    shippedOnBoardDate: string;
    eccsaCertificateOfOriginNumber: string;
  };
  goods: {
    descriptionOfGoods: string;
    hsCode: string;
  };
  containerLines: PackingListIccContainerLine[];
  totals: {
    grandTotalPackages: string;
    grandTotalNetWeightKgs: string;
    grandTotalGrossWeightKgs: string;
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
    packagingMarkingLabel: string;
    totalNetWeightMt: string;
    totalGrossWeightMt: string;
    packingDate: string;
    packingPlace: string;
    address: string;
    fullMarking: string;
    signatoryCompany: string;
    authorizedSignatoryName: string;
    declaration: string;
  };
  mappingNotes: string[];
}

function clean(value: string | number | undefined | null): string {
  if (value === undefined || value === null) {
    return "";
  }

  const normalized = String(value).trim();
  if (!normalized || normalized === "-") {
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

function parseNumeric(value: string): number | null {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/,/g, "").trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatNumber(value: number, digits = 3): string {
  if (!Number.isFinite(value) || value <= 0) {
    return "";
  }

  return value.toFixed(digits).replace(/\.?0+$/, "");
}

function formatQuantity(value: number): string {
  const normalized = formatNumber(value);
  return normalized ? `${normalized} KGS` : "";
}

function rowContractValue(reportRows: ReturnType<typeof buildContractSiLcReport>["rows"], rowNumber: number): string {
  const row = reportRows.find((candidate) => candidate.rowNumber === rowNumber);
  return clean(row?.contractValue);
}

function buildContainerLines(args: {
  staffingRows: StaffingFinalRow[];
  noOfBags: string;
  totalNetWeightKg: number;
  totalGrossWeightKg: number;
  containerCount: number;
}): PackingListIccContainerLine[] {
  const groups = vehicleGroupsWithContainers(args.staffingRows);
  if (groups.length === 0) {
    return [];
  }

  const parsedNoOfBags = parseNumeric(args.noOfBags);
  const divisor = args.containerCount > 0 ? args.containerCount : groups.length;
  const packages = parsedNoOfBags ? formatNumber(parsedNoOfBags / divisor) : "";
  const netWeightKgs = divisor > 0 ? formatNumber(args.totalNetWeightKg / divisor) : "";
  const grossWeightKgs = divisor > 0 ? formatNumber(args.totalGrossWeightKg / divisor) : "";

  return groups.map((group) => ({
    containerNumber: combineVehicleField(group.truck?.containerNumber, group.trailer?.containerNumber),
    sealNumber: combineVehicleField(group.truck?.sealNumber, group.trailer?.sealNumber),
    packages,
    netWeightKgs,
    grossWeightKgs,
  }));
}

export function buildPackingListIccSample(args: {
  contract: Contract;
  customer: Customer;
  companyConfigurationInput?: Partial<CompanyConfiguration> | null;
  finalFields: ResolvedFinalFields;
  bookings?: BookingsSheet;
  staffingRows: StaffingFinalRow[];
  processing?: ProcessingSheet;
}): PackingListIccSample {
  const companyConfiguration = resolveCompanyConfiguration(args.contract.orgId, args.companyConfigurationInput);
  const parity = computeContractExcelParity(args.contract.terms, companyConfiguration);
  const report = buildContractSiLcReport(args.contract, args.customer);
  const packagingMarkingLabel = rowContractValue(report.rows, 35) || clean(args.finalFields.bagMarking);

  const lineItems = buildContainerLines({
    staffingRows: args.staffingRows,
    noOfBags: args.finalFields.noOfBags,
    totalNetWeightKg: parity.quantityKg,
    totalGrossWeightKg: parity.grossWeightKg,
    containerCount: parity.containerCount,
  });

  const grandTotalPackages = formatNumber(lineItems.reduce((total, line) => total + (parseNumeric(line.packages) ?? 0), 0));
  const grandTotalNetWeightKgs = formatQuantity(lineItems.reduce((total, line) => total + (parseNumeric(line.netWeightKgs) ?? 0), 0));
  const grandTotalGrossWeightKgs = formatQuantity(lineItems.reduce((total, line) => total + (parseNumeric(line.grossWeightKgs) ?? 0), 0));
  const today = formatDate(new Date().toISOString());
  const documentRefNo = clean(args.contract.documentRefs?.packing_list);

  return {
    contractId: args.contract.id,
    contractNumber: args.contract.contractNumber,
    header: {
      date: today,
      salesContractRef: clean(args.contract.contractNumber),
      refNo: documentRefNo,
      salesContractDate: formatDate(args.contract.createdAt),
      exporterBeneficiarySeller: `${companyConfiguration.sellerName}, ${companyConfiguration.sellerAddress}`,
      bankPermitNumber: clean(args.contract.banking.permitNumber),
      applicantNotify: clean(args.finalFields.notify),
      billOfLadingNumber: clean(args.bookings?.billOfLadingNumber),
      shippingLine: clean(args.bookings?.shippingLine),
      vesselName: clean(args.bookings?.vesselName),
      voyageNo: clean(args.bookings?.voyageNo),
      consignee: clean(args.finalFields.consignee),
      shippedOnBoardDate: formatDate(args.contract.banking.latestShipmentDate),
      eccsaCertificateOfOriginNumber: "N/A",
    },
    goods: {
      descriptionOfGoods: clean(args.finalFields.description),
      hsCode: clean(companyConfiguration.defaultHsCode),
    },
    containerLines: lineItems,
    totals: {
      grandTotalPackages,
      grandTotalNetWeightKgs,
      grandTotalGrossWeightKgs,
    },
    footer: {
      countryOfOrigin: clean(companyConfiguration.defaultOrigin),
      placeOfIssue: clean(companyConfiguration.placeOfIssue),
      portOfLoading: clean(args.finalFields.portOfLoading),
      portOfDischarge: clean(args.finalFields.destination),
      finalDestination: clean(args.finalFields.destination),
      dateOfIssue: today,
      deliveryTradeTerm: clean(args.finalFields.deliveryTerm),
      typeOfShipment: buildTypeOfShipmentSummary({
        bookings: args.bookings,
        fallbackContainerCount: parity.containerCount,
        containerTypes: companyConfiguration.containerTypes,
      }),
      incoterm: "INCOTERMS 2020",
      termMethodOfPayment: clean(args.finalFields.paymentTerm),
      packagingMarkingLabel,
      totalNetWeightMt: `${formatNumber(parity.quantityMt)} MT`,
      totalGrossWeightMt: `${formatNumber(parity.grossWeightMt)} MT`,
      packingDate: "",
      packingPlace: clean(args.processing?.stationName),
      address: clean(args.processing?.stationAddress),
      fullMarking: clean(args.finalFields.bagMarking),
      signatoryCompany: clean(companyConfiguration.sellerName),
      authorizedSignatoryName: "",
      declaration: "We hereby certify that this invoice is in all respects correct and true, as regards to both the prices and description of the goods referred to herein, and that the country of origin of the goods is Ethiopia.",
    },
    mappingNotes: [
      "Packing List(ICC) uses formulas from sheet15 in Coffee Doc-Praxis-V2.xlsm.",
      "Header links: O8=Contract!C5, O9=Contract!C7, C11=Form Configuration seller/address concat, I11=Bank & LC!H5, I13=Bookings!B43, C14=Contract-SI-LC!K30, C17=Contract-SI-LC!K29, M14/Q14/O15 from Bookings.",
      "Goods links: C20=Contract-SI-LC!K28, D21=Form Configuration!D16, C23:E32 from Staffing!G/H rows, G/L/P columns split No of Bags and Contract net/gross by Contract!D34 container count.",
      "Footer links: E34 origin, E35 port of loading, E36/E37 destination, E38 delivery term, C42 payment term, C44 packaging label (Contract-SI-LC row 35), D46/F46 Contract MT totals, E48/E49 Processing station/address, E51 full marking.",
    ],
  };
}

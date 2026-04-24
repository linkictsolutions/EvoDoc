import { computeContractExcelParity, type ResolvedFinalFields } from "@/domain/excel-parity";
import { resolveCompanyConfiguration } from "@/domain/company-configuration";
import type {
  BookingsSheet,
  CompanyConfiguration,
  Contract,
  ProcessingSheet,
  StaffingFinalRow,
} from "@/types/models";

interface ContainerLine {
  containerNo: string;
  sealNo: string;
  bagsPerContainer: string;
}

function clean(value: string | undefined | null): string {
  const normalized = value?.trim();
  return normalized && normalized !== "-" ? normalized : "";
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

function formatQuantity(value: number, unit: "KG" | "LBS"): string {
  if (!Number.isFinite(value) || value <= 0) {
    return "";
  }

  const normalized = Number.isInteger(value) ? String(value) : value.toFixed(3).replace(/\.?0+$/, "");
  return `${normalized} ${unit}`;
}

function parseNumeric(value: string): number | null {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/,/g, "").trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function joinIcoNo(prefix: string, certNo: string): string {
  const left = prefix.replace(/\/+$/, "");
  const right = certNo.replace(/^\/+/, "");
  if (!left) {
    return right;
  }
  if (!right) {
    return left;
  }

  return `${left}/${right}`;
}

function buildModeOfTransportation(bookings?: BookingsSheet): string {
  const shippingLine = clean(bookings?.shippingLine);
  const vessel = clean(bookings?.vesselName);
  const voyage = clean(bookings?.voyageNo);
  const billOfLading = clean(bookings?.billOfLadingNumber);

  if (!shippingLine && !vessel && !voyage && !billOfLading) {
    return "";
  }

  return `${shippingLine}, VESSEL ${vessel}, VOYAGE NO ${voyage}, UNDER B/L NO ${billOfLading} WERE PACKED IN JUTE BAGS AS FOLLOWS:`
    .replace(/\s+/g, " ")
    .replace(" ,", ",")
    .trim();
}

function buildContainerLines(
  staffingRows: StaffingFinalRow[],
  noOfBagsValue: string,
): ContainerLine[] {
  const preparedContainers = staffingRows.filter((row) => clean(row.containerNumber).length > 0);
  if (preparedContainers.length === 0) {
    return [];
  }

  const parsedBags = parseNumeric(noOfBagsValue);
  const bagsPerContainer = parsedBags && preparedContainers.length > 0
    ? (parsedBags / preparedContainers.length).toFixed(3).replace(/\.?0+$/, "")
    : "";

  return preparedContainers.map((row) => ({
    containerNo: clean(row.containerNumber),
    sealNo: clean(row.sealNumber),
    bagsPerContainer,
  }));
}

export interface CertificateOfQualitySample {
  header: {
    date: string;
    refNo: string;
    titleStatement: string;
  };
  details: {
    modeOfTransportation: string;
    moistureContent: string;
    shipper: string;
    notify: string;
    secondNotify: string;
    descriptionOfGoods: string;
    origin: string;
    quality: string;
    icoNo: string;
    certNo: string;
    netWeight: string;
    grossWeight: string;
    quantityLb: string;
    from: string;
    to: string;
    signatoryCompany: string;
  };
  containerLines: ContainerLine[];
  mappingNotes: string[];
}

export function buildCertificateOfQualitySample(args: {
  contract: Contract;
  companyConfigurationInput?: Partial<CompanyConfiguration> | null;
  finalFields: ResolvedFinalFields;
  processing?: ProcessingSheet;
  bookings?: BookingsSheet;
  staffingRows: StaffingFinalRow[];
}): CertificateOfQualitySample {
  const companyConfiguration = resolveCompanyConfiguration(args.contract.orgId, args.companyConfigurationInput);
  const parity = computeContractExcelParity(args.contract.terms, companyConfiguration);
  const certNo = clean(args.finalFields.certNo);

  const titleStatement = `THIS IS A QUALITY CERTIFICATE IS FOR ${args.finalFields.description}`.trim();
  const moistureValue = typeof args.processing?.moisturePercent === "number"
    ? String(args.processing.moisturePercent)
    : "";
  const documentRefNo = clean(args.contract.documentRefs?.certificate_of_quality);

  return {
    header: {
      date: formatDate(new Date().toISOString()),
      refNo: documentRefNo,
      titleStatement,
    },
    details: {
      modeOfTransportation: buildModeOfTransportation(args.bookings),
      moistureContent: moistureValue,
      shipper: `${companyConfiguration.sellerName}, ${companyConfiguration.sellerAddress}`,
      notify: clean(args.finalFields.notify),
      secondNotify: clean(args.finalFields.secondNotify),
      descriptionOfGoods: clean(args.finalFields.description),
      origin: clean(companyConfiguration.defaultOrigin),
      quality: clean(args.finalFields.quality),
      icoNo: joinIcoNo(companyConfiguration.icoReferencePrefix, certNo),
      certNo,
      netWeight: formatQuantity(parity.quantityKg, "KG"),
      grossWeight: formatQuantity(parity.grossWeightKg, "KG"),
      quantityLb: formatQuantity(parity.quantityLb, "LBS"),
      from: clean(args.finalFields.portOfLoading),
      to: clean(args.finalFields.destination),
      signatoryCompany: clean(companyConfiguration.sellerName),
    },
    containerLines: buildContainerLines(args.staffingRows, args.finalFields.noOfBags),
    mappingNotes: [
      "Certificate of Quality sheet (sheet17) formula bindings were mapped from Coffee Doc-Praxis-V2.xlsm.",
      "Header/details links: B9 from Contract-SI-LC!K28, C11 from Bookings!C5/C6/C7/B43, C12 from Processing!D4, C13 from Form Configuration!B1:D2, C14/C15/C16/C18/C24/C25 from Contract-SI-LC.",
      "Other links: C17=Form Configuration!K7, C19=Form Configuration!A12 + Contract!F54, C20=Contract!F54, C21/C22/C23 from Contract weights, C39 from Form Configuration!B1.",
      "Container table links: B28:D37 from Staffing!G22:H31 and calculated bags-per-container.",
    ],
  };
}

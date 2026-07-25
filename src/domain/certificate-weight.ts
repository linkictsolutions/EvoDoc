import { packagingOptionFor, resolveCompanyConfiguration } from "@/domain/company-configuration";
import { computeContractExcelParity, type ResolvedFinalFields } from "@/domain/excel-parity";
import { formatGroupedNumber } from "@/domain/rounding";
import { combineVehicleField, vehicleGroupsWithContainers } from "@/domain/vehicle-container-groups";
import type {
  CompanyConfiguration,
  Contract,
  StaffingFinalRow,
} from "@/types/models";

interface ContainerLine {
  containerNo: string;
  sealNo: string;
  bagsPerContainer: string;
  bagWeightNet: string;
  bagWeightGross: string;
  containerNetWeight: string;
  containerGrossWeight: string;
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

function formatNumber(value: number, digits = 3): string {
  if (!Number.isFinite(value) || value <= 0) {
    return "";
  }

  return formatGroupedNumber(value, digits);
}

function formatQuantity(value: number, unit: "KG" | "KGS"): string {
  const normalized = formatNumber(value);
  return normalized ? `${normalized} ${unit}` : "";
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

function resolveBagWeights(
  companyConfiguration: CompanyConfiguration,
  contract: Contract,
  finalFields: ResolvedFinalFields,
) {
  const packagingUnit = clean(finalFields.uomPacking) || clean(contract.terms.packagingUnit);
  const definition = packagingUnit
    ? packagingOptionFor(companyConfiguration, packagingUnit)
    : undefined;

  const net = definition?.netWeightKg || contract.terms.bagWeightKg;
  const gross = definition
    ? definition.netWeightKg + definition.bagWeightKg
    : net;

  return {
    net: formatNumber(net),
    gross: formatNumber(gross),
  };
}

function buildPackagesInBags(
  finalFields: ResolvedFinalFields,
  contract: Contract,
  fallbackNoOfBags: number,
): string {
  const noOfBags = clean(finalFields.noOfBags) || formatNumber(fallbackNoOfBags, 0);
  const packagingUnit = clean(finalFields.uomPacking) || clean(contract.terms.packagingUnit);
  if (!noOfBags) {
    return "";
  }

  return packagingUnit ? `${noOfBags} ${packagingUnit}` : noOfBags;
}

function buildContainerLines(args: {
  staffingRows: StaffingFinalRow[];
  noOfBagsValue: string;
  fallbackNoOfBags: number;
  totalNetWeightKg: number;
  totalGrossWeightKg: number;
  bagWeightNet: string;
  bagWeightGross: string;
}): ContainerLine[] {
  const groups = vehicleGroupsWithContainers(args.staffingRows);
  if (groups.length === 0) {
    return [];
  }

  const parsedBags = parseNumeric(args.noOfBagsValue) ?? (args.fallbackNoOfBags > 0 ? args.fallbackNoOfBags : null);
  const containerCount = groups.length;
  const bagsPerContainer = parsedBags
    ? formatNumber(parsedBags / containerCount)
    : "";
  const netPerContainer = args.totalNetWeightKg > 0
    ? formatNumber(args.totalNetWeightKg / containerCount)
    : "";
  const grossPerContainer = args.totalGrossWeightKg > 0
    ? formatNumber(args.totalGrossWeightKg / containerCount)
    : "";

  return groups.map((group) => ({
    containerNo: combineVehicleField(group.truck?.containerNumber, group.trailer?.containerNumber),
    sealNo: combineVehicleField(group.truck?.sealNumber, group.trailer?.sealNumber),
    bagsPerContainer,
    bagWeightNet: args.bagWeightNet,
    bagWeightGross: args.bagWeightGross,
    containerNetWeight: netPerContainer,
    containerGrossWeight: grossPerContainer,
  }));
}

export interface CertificateOfWeightSample {
  header: {
    date: string;
    refNo: string;
  };
  details: {
    shipper: string;
    notify: string;
    secondNotify: string;
    descriptionOfGoods: string;
    netWeight: string;
    grossWeight: string;
    packagesInBags: string;
    origin: string;
    quality: string;
    icoNo: string;
    certNo: string;
    from: string;
    to: string;
  };
  containerLines: ContainerLine[];
  totals: {
    totalNetWeightKgs: string;
    totalGrossWeightKgs: string;
  };
  mappingNotes: string[];
}

export function buildCertificateOfWeightSample(args: {
  contract: Contract;
  companyConfigurationInput?: Partial<CompanyConfiguration> | null;
  finalFields: ResolvedFinalFields;
  staffingRows: StaffingFinalRow[];
}): CertificateOfWeightSample {
  const companyConfiguration = resolveCompanyConfiguration(args.contract.orgId, args.companyConfigurationInput);
  const parity = computeContractExcelParity(args.contract.terms, companyConfiguration);
  const certNo = clean(args.finalFields.certNo);
  const bagWeights = resolveBagWeights(companyConfiguration, args.contract, args.finalFields);
  const documentRefNo = clean(args.contract.documentRefs?.certificate_of_weight);

  const containerLines = buildContainerLines({
    staffingRows: args.staffingRows,
    noOfBagsValue: args.finalFields.noOfBags,
    fallbackNoOfBags: parity.noOfBags,
    totalNetWeightKg: parity.quantityKg,
    totalGrossWeightKg: parity.grossWeightKg,
    bagWeightNet: bagWeights.net,
    bagWeightGross: bagWeights.gross,
  });

  return {
    header: {
      date: formatDate(new Date().toISOString()),
      refNo: documentRefNo,
    },
    details: {
      shipper: `${companyConfiguration.sellerName} ${companyConfiguration.sellerAddress}`,
      notify: clean(args.finalFields.notify),
      secondNotify: clean(args.finalFields.secondNotify),
      descriptionOfGoods: clean(args.finalFields.description),
      netWeight: formatQuantity(parity.quantityKg, "KG"),
      grossWeight: formatQuantity(parity.grossWeightKg, "KG"),
      packagesInBags: buildPackagesInBags(args.finalFields, args.contract, parity.noOfBags),
      origin: clean(companyConfiguration.defaultOrigin),
      quality: clean(args.finalFields.quality),
      icoNo: joinIcoNo(companyConfiguration.icoReferencePrefix, certNo),
      certNo,
      from: clean(args.finalFields.portOfLoading),
      to: clean(args.finalFields.destination),
    },
    containerLines,
    totals: {
      totalNetWeightKgs: formatQuantity(parity.quantityKg, "KGS"),
      totalGrossWeightKgs: formatQuantity(parity.grossWeightKg, "KGS"),
    },
    mappingNotes: [
      "Certificate of Weight sheet (sheet18) formula bindings were mapped from Coffee Doc-Praxis-V2.xlsm.",
      "Header/details links: C9 from Form Configuration seller/address, C10/C11/C12/C17/C20/C21 from Contract-SI-LC, C13/C14/C19 from Contract, C16/C18 from Form Configuration.",
      "Container table links: C25:I34 from Staffing container/seal plus calculated bags-per-container and container net/gross splits.",
      "Totals links: H35/I35 are summed container net/gross values in KGS.",
    ],
  };
}

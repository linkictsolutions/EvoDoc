import { resolveCompanyConfiguration } from "@/domain/company-configuration";
import { computeContractExcelParity, type ResolvedFinalFields } from "@/domain/excel-parity";
import type {
  CompanyConfiguration,
  Contract,
  StaffingFinalRow,
} from "@/types/models";

interface DriverRowPair {
  truck?: StaffingFinalRow;
  trailer?: StaffingFinalRow;
}

export interface WayBillDriverTab {
  key: string;
  tabLabel: string;
  date: string;
  refNo: string;
  to: string;
  toContact: string;
  truckNo: string;
  trailerNo: string;
  driverName: string;
  driverPhoneNo: string;
  licenseNo: string;
  finalDestination: string;
  driverDeclaration: string;
  conditionIntro: string;
  condition1: string;
  condition2: string;
  condition3: string;
  detailOfGoods: string;
  icoNo: string;
  certNo: string;
  noOfBag: string;
  grossWeight: string;
  netWeight: string;
  transportChargeLabel: string;
  transportChargePerQuantal: string;
  transportChargeTotal: string;
  containerNo1: string;
  sealNo1: string;
  containerNo2: string;
  sealNo2: string;
  amharicDeclaration: string;
  signatoryDriverLabel: string;
  signatoryLeftLabel: string;
  signatoryRightLabel: string;
  signatoryDateLabel: string;
  signatoryStampDateLabel: string;
}

export interface WayBillSample {
  title: string;
  drivers: WayBillDriverTab[];
  mappingNotes: string[];
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

  return value.toFixed(digits).replace(/\.?0+$/, "");
}

function formatWeight(value: number): string {
  const normalized = formatNumber(value);
  return normalized ? `${normalized} KG` : "";
}

function formatAmount(value: number): string {
  const normalized = formatNumber(value, 2);
  return normalized || "";
}

function hasAssignedVehicle(row?: StaffingFinalRow): boolean {
  if (!row) {
    return false;
  }

  return Boolean(clean(row.plateNo) || clean(row.containerNumber));
}

function rowHasData(row: StaffingFinalRow): boolean {
  return Boolean(
    clean(row.driverName)
    || clean(row.plateNo)
    || clean(row.containerNumber)
    || clean(row.sealNumber)
    || clean(row.certNumber),
  );
}

function normalizeCertNumber(value: string): string {
  const normalized = value.trim();
  if (!normalized || normalized === "-") {
    return "";
  }

  if (/^\d+$/.test(normalized)) {
    return normalized.padStart(4, "0");
  }

  return normalized;
}

function joinUnique(values: string[]): string {
  const unique = new Set<string>();
  for (const value of values) {
    const normalized = value.trim();
    if (normalized) {
      unique.add(normalized);
    }
  }

  return Array.from(unique).join(" and ");
}

function joinIcoNo(prefix: string, certNo: string): string {
  if (!certNo) {
    return "";
  }

  const left = prefix.replace(/\/+$/, "");
  const right = certNo.replace(/^\/+/, "");
  if (!left) {
    return right;
  }

  return `${left}/${right}`;
}

function buildDriverRowPairs(staffingRows: StaffingFinalRow[]): DriverRowPair[] {
  const sorted = [...staffingRows].sort((left, right) => left.rowNo - right.rowNo);
  const consumed = new Set<number>();
  const pairs: DriverRowPair[] = [];

  for (let index = 0; index < sorted.length; index += 1) {
    const row = sorted[index];
    if (consumed.has(row.rowNo) || !rowHasData(row)) {
      continue;
    }

    if (row.vehicleType !== "TRUCK") {
      continue;
    }

    let trailer: StaffingFinalRow | undefined;
    const candidate = sorted[index + 1];
    if (
      candidate
      && candidate.vehicleType === "TRAILER"
      && !consumed.has(candidate.rowNo)
      && rowHasData(candidate)
    ) {
      const sameVehicleNo = row.vehicleNo && candidate.vehicleNo
        ? row.vehicleNo === candidate.vehicleNo
        : true;
      const sameDriver = clean(row.driverName) && clean(candidate.driverName)
        ? clean(row.driverName) === clean(candidate.driverName)
        : true;

      if (sameVehicleNo || sameDriver) {
        trailer = candidate;
        consumed.add(candidate.rowNo);
      }
    }

    consumed.add(row.rowNo);
    pairs.push({ truck: row, trailer });
  }

  for (const row of sorted) {
    if (consumed.has(row.rowNo) || !rowHasData(row)) {
      continue;
    }

    consumed.add(row.rowNo);
    if (row.vehicleType === "TRAILER") {
      pairs.push({ trailer: row });
    } else {
      pairs.push({ truck: row });
    }
  }

  return pairs;
}

function buildDetailOfGoods(
  sellerName: string,
  finalFields: ResolvedFinalFields,
): string {
  return [
    sellerName,
    "PRODUCE OF ETHIOPIAN ARABICA COFFEE",
    clean(finalFields.origin),
    "GRADE",
    clean(finalFields.grade),
  ].filter((value) => value.trim().length > 0).join(" ");
}

function buildDriverDeclaration(driverName: string, sellerName: string): string {
  if (!driverName) {
    return "";
  }

  return `I ${driverName} the undersigned_____________and that I have Received the Goods from ${sellerName} and bind myself to convey them safe to Djibouti port.`;
}

const AMHARIC_DECLARATION =
  "ከላይ የተጠቀሱትን ህግና ደንቦች አንብቤና ተረድቼ ለማንኛውም ችግር ሀላፊነት ለመውሰድ በፊርማየ አረጋግጣለሁ፡ ፡";

export function buildWayBillSample(args: {
  contract: Contract;
  companyConfigurationInput?: Partial<CompanyConfiguration> | null;
  finalFields: ResolvedFinalFields;
  staffingRows: StaffingFinalRow[];
}): WayBillSample {
  const companyConfiguration = resolveCompanyConfiguration(args.contract.orgId, args.companyConfigurationInput);
  const parity = computeContractExcelParity(args.contract.terms, companyConfiguration);
  const driverPairs = buildDriverRowPairs(args.staffingRows);
  const rows = driverPairs;
  const perContainerBags = parity.containerCount > 0 ? parity.noOfBags / parity.containerCount : 0;
  const perContainerGrossWeight = parity.containerCount > 0 ? parity.grossWeightKg / parity.containerCount : 0;
  const perContainerNetWeight = parity.containerCount > 0 ? parity.quantityKg / parity.containerCount : 0;

  const to = clean(companyConfiguration.transitorCompanyName);
  const transitorLocation = clean(companyConfiguration.transitorLocation);
  const transitorPhone = clean(companyConfiguration.transitorPhoneNumber);
  const toContact = transitorLocation && transitorPhone
    ? `${transitorLocation}(${transitorPhone})`
    : (transitorLocation || transitorPhone);
  const sellerName = clean(companyConfiguration.sellerName);
  const goodsDescription = buildDetailOfGoods(sellerName, args.finalFields);
  const documentRefNo = clean(args.contract.documentRefs?.way_bill);

  return {
    title: "Way Bill",
    drivers: rows.map((pair, index) => {
      const truckNo = clean(pair.truck?.plateNo);
      const trailerNo = clean(pair.trailer?.plateNo);
      const driverName = clean(pair.truck?.driverName) || clean(pair.trailer?.driverName) || `Driver ${index + 1}`;
      const driverPhoneNo = clean(pair.truck?.driverPhoneNo) || clean(pair.trailer?.driverPhoneNo);
      const licenseNo = clean(pair.truck?.licenseNo) || clean(pair.trailer?.licenseNo);

      const truckCert = normalizeCertNumber(clean(pair.truck?.certNumber));
      const trailerCert = normalizeCertNumber(clean(pair.trailer?.certNumber));
      const certValues = [truckCert, trailerCert].filter(Boolean);
      const certNo = joinUnique(certValues);
      const icoNo = joinUnique(certValues.map((cert) => joinIcoNo(companyConfiguration.icoReferencePrefix, cert)));

      const assignedVehicles = Number(hasAssignedVehicle(pair.truck)) + Number(hasAssignedVehicle(pair.trailer));
      const shipmentUnits = assignedVehicles > 0 ? assignedVehicles : 1;
      const shipmentNetWeightKg = perContainerNetWeight * shipmentUnits;
      const transportChargeTotalValue = parity.quantityKg > 0
        ? (parity.totalPrice * shipmentNetWeightKg) / parity.quantityKg
        : 0;
      const transportChargePerQuantalValue = shipmentNetWeightKg > 0
        ? transportChargeTotalValue / (shipmentNetWeightKg / 100)
        : 0;
      const noOfBag = formatNumber(perContainerBags * shipmentUnits);
      const grossWeight = formatWeight(perContainerGrossWeight * shipmentUnits);
      const netWeight = formatWeight(shipmentNetWeightKg);

      const tabSuffix = truckNo || trailerNo || String(index + 1);

      return {
        key: `driver-${index + 1}-${tabSuffix.replace(/\s+/g, "-").toLowerCase()}`,
        tabLabel: truckNo ? `${driverName} (${truckNo})` : driverName,
        date: formatDate(new Date().toISOString()),
        refNo: documentRefNo,
        to,
        toContact: toContact ? `${toContact}` : "",
        truckNo,
        trailerNo,
        driverName,
        driverPhoneNo,
        licenseNo,
        finalDestination: clean(args.finalFields.portOfLoading),
        driverDeclaration: buildDriverDeclaration(driverName, sellerName || "the exporter"),
        conditionIntro: "According to the following terms and conditions.",
        condition1: "1. I undertake to make good any shortage in goods at the market price ruling.",
        condition2: "2. I agree that this consignment is now under my charge and entire responsibility.",
        condition3:
          "3. I declare that my lorry is equipped with tarpaulin and that I have received the described goods in good condition.",
        detailOfGoods: goodsDescription,
        icoNo,
        certNo,
        noOfBag,
        grossWeight,
        netWeight,
        transportChargeLabel: "The Truck carry the above mentioned Transport at ETH Birr",
        transportChargePerQuantal: `${formatAmount(transportChargePerQuantalValue)} per quantal`.trim(),
        transportChargeTotal: `total Birr ${formatAmount(transportChargeTotalValue)}`.trim(),
        containerNo1: clean(pair.truck?.containerNumber),
        sealNo1: clean(pair.truck?.sealNumber),
        containerNo2: clean(pair.trailer?.containerNumber),
        sealNo2: clean(pair.trailer?.sealNumber),
        amharicDeclaration: AMHARIC_DECLARATION,
        signatoryDriverLabel: "Driver name:",
        signatoryLeftLabel: "Signature:",
        signatoryRightLabel: "Signature:",
        signatoryDateLabel: "Date:",
        signatoryStampDateLabel: "Stamp & Date:",
      };
    }),
    mappingNotes: [
      "WAY BILL sheet (sheet19) formula bindings were mapped from Coffee Doc-Praxis-V2.xlsm.",
      "Driver-driven selection in Excel C16 uses data validation from Staffing!AI6:AI10; web output renders one tab per available driver/truck pair.",
      "Party and route links: C11/C12 from Form Configuration transitor cells, C19 from Contract-SI-LC!K24.",
      "Driver and vehicle links: C14/C15/C17/C18 and E36/H36/E38/H38 use INDEX/MATCH against Staffing rows keyed by driver.",
      "Goods links: C28, D29:D33 map from seller/origin/grade, cert values, and per-container contract splits.",
      "Amharic declaration line C39 is preserved verbatim in the web template.",
    ],
  };
}

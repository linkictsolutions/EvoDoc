import { resolveCompanyConfiguration } from "@/domain/company-configuration";
import { computeContractExcelParity, resolveContractSiLcFinalFields } from "@/domain/excel-parity";
import type {
  BillOfLadingInfo,
  BookingsSheet,
  CompanyConfiguration,
  Contract,
  Customer,
  DocumentInputSnapshot,
  StaffingFinalRow,
} from "@/types/models";

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
    return clean(value);
  }
  return parsed.toLocaleDateString("en-GB");
}

function joinParts(parts: string[], separator = " "): string {
  return parts.map((part) => part.trim()).filter(Boolean).join(separator);
}

function dedupe(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function buildContainerSealMarks(args: {
  bookings?: BookingsSheet;
  staffingRows: StaffingFinalRow[];
  fullMarking: string;
}) {
  const staffingPairs = args.staffingRows
    .map((row) => ({
      container: clean(row.containerNumber),
      seals: dedupe([clean(row.sealNumber)]),
    }))
    .filter((entry) => entry.container || entry.seals.length > 0);

  const bookingPairs = (args.bookings?.entries ?? [])
    .map((entry) => ({
      container: clean(entry.containerNumber),
      seals: dedupe([clean(entry.sealNumber), clean(entry.secondSealNumber)]),
    }))
    .filter((entry) => entry.container || entry.seals.length > 0);

  const sourcePairs = staffingPairs.length > 0 ? staffingPairs : bookingPairs;
  const lines = sourcePairs.map((entry) => {
    const parts = [
      entry.container ? `Container No: ${entry.container}` : "",
      entry.seals.length > 0 ? `Seal No: ${entry.seals.join(", ")}` : "",
    ].filter(Boolean);
    return parts.join(" | ");
  }).filter(Boolean);

  return [lines.join("\n"), args.fullMarking].filter(Boolean).join("\n\n");
}

function fallbackBillOfLading(
  value: BillOfLadingInfo | undefined,
): Required<Pick<BillOfLadingInfo, "billType" | "shipperReferenceType">> & BillOfLadingInfo {
  return {
    billType: value?.billType ?? "ORIGINAL BILL No.",
    shipperReferenceType: value?.shipperReferenceType ?? "Booking Ref",
    ...value,
  };
}

function splitIntoRiderPages(source: string, manualPages: string[]): string[] {
  if (manualPages.length > 0) {
    return manualPages;
  }

  const normalized = source.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return [];
  }

  const overflowStart = 900;
  if (normalized.length <= overflowStart) {
    return [];
  }

  const remainder = normalized.slice(overflowStart);
  const chunks: string[] = [];
  let cursor = 0;
  const chunkSize = 1800;
  while (cursor < remainder.length) {
    chunks.push(remainder.slice(cursor, cursor + chunkSize).trim());
    cursor += chunkSize;
  }
  return chunks.filter(Boolean);
}

function buildCargoDescription(args: {
  contract: Contract;
  customer: Customer;
  companyConfiguration: CompanyConfiguration;
  billOfLading: BillOfLadingInfo;
  bookings?: BookingsSheet;
  staffingRows: StaffingFinalRow[];
}) {
  const parity = computeContractExcelParity(args.contract.terms, args.companyConfiguration);
  const snapshot = {
    docType: "bill_of_lading" as const,
    docVariant: "standard" as const,
    contract: args.contract,
    customer: args.customer,
    shipment: {
      id: "preview",
      orgId: args.contract.orgId,
      contractId: args.contract.id,
      status: "draft" as const,
      bookingLines: [],
      totals: {
        totalBags: 0,
        totalGrossWeightKg: 0,
        totalTareWeightKg: 0,
        totalNetWeightKg: 0,
      },
      createdAt: args.contract.createdAt,
      updatedAt: args.contract.updatedAt,
    },
    companyConfiguration: args.companyConfiguration,
    executionData: {
      bookings: args.bookings,
      staffing: { finalRows: args.staffingRows } as never,
    },
  } satisfies DocumentInputSnapshot<"bill_of_lading">;
  const finalFields = resolveContractSiLcFinalFields(snapshot, parity);
  const certRange = finalFields.certNo;
  const icoPrefix = clean(args.companyConfiguration.icoReferencePrefix);
  const containerSummary = `${Math.max(1, parity.containerCount)} X 20 FT FCL/FCL`;
  const grossWeight = `${parity.grossWeightKg.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}KG`;
  const fullMarking = clean(finalFields.bagMarking) || joinParts([
    clean(args.companyConfiguration.sellerName),
    "PRODUCE OF ETHIOPIA",
    clean(args.contract.terms.quality),
    `CROP: ${clean(finalFields.cropYear)}`,
    `COUNTRY OF ORIGIN: ${clean(finalFields.origin)}`,
    certRange ? `CERT NO: ${certRange}` : "",
    icoPrefix && certRange ? `ICO NO: ${icoPrefix}/${certRange}` : "",
    `NET WEIGHT: ${clean(String(args.contract.terms.bagWeightKg))}KG`,
  ], "\n");
  const description = clean(args.billOfLading.descriptionOverride) || joinParts([
    `${args.contract.terms.quantityBags} BAGS OF ${args.contract.terms.bagWeightKg} KGS NET`,
    clean(finalFields.description),
    `TOTAL QUANTITY: ${parity.quantityMt.toFixed(0)}MT`,
    `${containerSummary}`,
    `NET WEIGHT: ${parity.quantityKg.toLocaleString()} KGS`,
    `GROSS WEIGHT: ${parity.grossWeightKg.toLocaleString()} KGS`,
    `HS CODE NO ${clean(args.companyConfiguration.defaultHsCode)}`,
    `CONTRACT NO:${clean(args.contract.contractNumber)}`,
    clean(args.contract.banking.lcNumber) ? `DOCUMENTARY CREDIT NUMBER:${clean(args.contract.banking.lcNumber)}` : "",
    clean(args.contract.shipping.serviceContract) ? `SERVICE CONTRACT NUMBER:${clean(args.contract.shipping.serviceContract)}` : "",
  ], " ");

  return {
    description,
    marks: buildContainerSealMarks({
      bookings: args.bookings,
      staffingRows: args.staffingRows,
      fullMarking,
    }),
    grossCargoWeight: grossWeight,
    measurement: clean(args.billOfLading.measurement),
    certRange,
  };
}

export interface BillOfLadingSample {
  title: string;
  meta: {
    pageLabel: string;
    billType: string;
    noOfCopyBills: string;
    noOfRiderPages: string;
    billNo: string;
    referenceType: string;
    referenceValue: string;
  };
  parties: {
    shipper: string;
    consignee: string;
    notifyParty: string;
    carrierAgentsEndorsements: string;
    notify2: string;
    notify3: string;
  };
  routing: {
    vesselAndVoyageNo: string;
    portOfLoading: string;
    placeOfReceipt: string;
    portOfDischarge: string;
    placeOfDelivery: string;
  };
  cargo: {
    marks: string;
    description: string;
    grossCargoWeight: string;
    measurement: string;
  };
  footer: {
    freightAndCharges: string;
    legalText: string;
    declaredValue: string;
    carrierReceipt: string;
    signedOnBehalf: string;
    placeAndDateOfIssue: string;
    shippedOnBoardDate: string;
  };
  riderPages: Array<{
    index: number;
    totalPages: number;
    billNo: string;
    description: string;
    placeAndDateOfIssue: string;
    shippedOnBoardDate: string;
  }>;
}

export function buildBillOfLadingSample(args: {
  contract: Contract;
  customer: Customer;
  companyConfigurationInput?: Partial<CompanyConfiguration> | null;
  bookings?: BookingsSheet;
  staffingRows: StaffingFinalRow[];
}) : BillOfLadingSample {
  const companyConfiguration = resolveCompanyConfiguration(args.contract.orgId, args.companyConfigurationInput);
  const parity = computeContractExcelParity(args.contract.terms, companyConfiguration);
  const finalFieldsSnapshot = {
    docType: "bill_of_lading" as const,
    docVariant: "standard" as const,
    contract: args.contract,
    customer: args.customer,
    shipment: {
      id: "preview",
      orgId: args.contract.orgId,
      contractId: args.contract.id,
      status: "draft" as const,
      bookingLines: [],
      totals: {
        totalBags: 0,
        totalGrossWeightKg: 0,
        totalTareWeightKg: 0,
        totalNetWeightKg: 0,
      },
      createdAt: args.contract.createdAt,
      updatedAt: args.contract.updatedAt,
    },
    companyConfiguration,
    executionData: {
      bookings: args.bookings,
      staffing: { finalRows: args.staffingRows } as never,
    },
  } satisfies DocumentInputSnapshot<"bill_of_lading">;
  const finalFields = resolveContractSiLcFinalFields(finalFieldsSnapshot, parity);

  const bill = fallbackBillOfLading(args.contract.billOfLading);
  const cargo = buildCargoDescription({
    contract: args.contract,
    customer: args.customer,
    companyConfiguration,
    billOfLading: bill,
    bookings: args.bookings,
    staffingRows: args.staffingRows,
  });
  const riderPages = splitIntoRiderPages(cargo.description, bill.riderDescriptions ?? []);
  const totalPages = 1 + riderPages.length;

  return {
    title: "Bill of Lading (MSC)",
    meta: {
      pageLabel: `PAGE 1 OF ${totalPages} | ORIGINAL`,
      billType: bill.billType,
      noOfCopyBills: clean(bill.noOfCopyBills) || "3",
      noOfRiderPages: String(riderPages.length),
      billNo: clean(bill.billNo) || clean(args.bookings?.billOfLadingNumber),
      referenceType: bill.shipperReferenceType,
      referenceValue: clean(bill.shipperReferenceValue) || clean(args.bookings?.bookingNumber),
    },
    parties: {
      shipper: joinParts([clean(companyConfiguration.sellerName), clean(companyConfiguration.sellerAddress)], "\n"),
      consignee: clean(finalFields.consignee),
      notifyParty: clean(finalFields.notify),
      carrierAgentsEndorsements: clean(bill.carrierAgentsEndorsements),
      notify2: clean(bill.notify2),
      notify3: clean(bill.notify3),
    },
    routing: {
      vesselAndVoyageNo: joinParts([clean(args.bookings?.vesselName) || clean(args.contract.shipping.vesselName), clean(args.bookings?.voyageNo)], " "),
      portOfLoading: clean(finalFields.portOfLoading),
      placeOfReceipt: clean(bill.placeOfReceipt),
      portOfDischarge: clean(finalFields.destination),
      placeOfDelivery: clean(bill.placeOfDelivery),
    },
    cargo,
    footer: {
      freightAndCharges: clean(bill.freightAndChargesText),
      legalText:
        "RECEIVED by the Carrier in apparent good order and condition (unless otherwise stated herein) the total number or quantity of Containers or other packages or units indicated in the box entitled Carrier's Receipt for carriage subject to all the terms and conditions hereof from the Place of Receipt or Port of Loading to the Port of Discharge or Place of Delivery, whichever is applicable. IN ACCEPTING THIS BILL OF LADING THE MERCHANT EXPRESSLY ACCEPTS AND AGREES TO ALL THE TERMS AND CONDITIONS, WHETHER PRINTED, STAMPED OR OTHERWISE INCORPORATED ON THIS SIDE AND ON THE REVERSE SIDE OF THIS BILL OF LADING AND THE TERMS AND CONDITIONS OF THE CARRIER'S APPLICABLE TARIFF AS IF THEY WERE ALL SIGNED BY THE MERCHANT.\n\nIf this is a negotiable (To Order / of) Bill of Lading, one original Bill of Lading, duly endorsed must be surrendered by the Merchant to the Carrier (together with outstanding Freight and charges) in exchange for the Goods or a Delivery Order. If this is a non-negotiable (straight) Bill of Lading, the Carrier shall deliver the Goods or issue a Delivery Order (after payment of outstanding Freight and charges) against the surrender of one original Bill of Lading or in accordance with the national law at the Port of Discharge or Place of Delivery whichever is applicable.\n\nIN WITNESS WHEREOF the Carrier or their Agent has signed the number of Bills of Lading stated at the top, all of this tenor and date, and wherever one original Bill of Lading has been surrendered all other Bills of Lading shall be void.",
      declaredValue: clean(bill.declaredValue),
      carrierReceipt: `${Math.max(1, parity.containerCount)} Containers`,
      signedOnBehalf: "SIGNED on behalf of the Carrier MSC Mediterranean Shipping Company S.A.",
      placeAndDateOfIssue: clean(bill.placeAndDateOfIssue),
      shippedOnBoardDate: formatDate(clean(bill.shippedOnBoardDate) || clean(args.contract.banking.latestShipmentDate)),
    },
    riderPages: riderPages.map((description, index) => ({
      index: index + 1,
      totalPages,
      billNo: clean(bill.billNo) || clean(args.bookings?.billOfLadingNumber),
      description,
      placeAndDateOfIssue: clean(bill.placeAndDateOfIssue),
      shippedOnBoardDate: formatDate(clean(bill.shippedOnBoardDate) || clean(args.contract.banking.latestShipmentDate)),
    })),
  };
}

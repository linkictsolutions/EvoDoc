import { computeContractExcelParity, generateCertificateRange } from "@/domain/excel-parity";
import { resolveCompanyConfiguration } from "@/domain/company-configuration";
import { buildPackagingAndMarkingLabel, resolvePackagingNetWeightKg } from "@/domain/party-and-packaging-text";
import { formatGroupedFixed, MONEY_DP } from "@/domain/rounding";
import type { Contract, Customer } from "@/types/models";

export type ContractSiLcSource =
  | "contract"
  | "shipping"
  | "revised_shipping"
  | "lc"
  | "revised_lc"
  | "none";

export interface ContractSiLcRow {
  rowNumber: number;
  label: string;
  contractValue: string;
  shippingValue: string;
  revisedShippingValue: string;
  lcValue: string;
  revisedLcValue: string;
  finalValue: string;
  finalSource: ContractSiLcSource;
}

export interface ContractSiLcReport {
  contractId: string;
  contractNumber: string;
  customerName: string;
  precedence: string;
  rows: ContractSiLcRow[];
}

function clean(value: string | number | undefined | null): string {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim();
}

function resolveFinal(row: Omit<ContractSiLcRow, "finalValue" | "finalSource">): Pick<ContractSiLcRow, "finalValue" | "finalSource"> {
  const candidates: Array<{ source: ContractSiLcSource; value: string }> = [
    { source: "revised_lc", value: row.revisedLcValue },
    { source: "lc", value: row.lcValue },
    { source: "revised_shipping", value: row.revisedShippingValue },
    { source: "shipping", value: row.shippingValue },
    { source: "contract", value: row.contractValue },
  ];

  const winner = candidates.find((candidate) => clean(candidate.value) !== "");

  if (!winner) {
    return {
      finalValue: "-",
      finalSource: "none",
    };
  }

  return {
    finalValue: winner.value,
    finalSource: winner.source,
  };
}

function makeRow(input: Omit<ContractSiLcRow, "finalValue" | "finalSource">): ContractSiLcRow {
  const resolved = resolveFinal(input);
  return {
    ...input,
    finalValue: resolved.finalValue,
    finalSource: resolved.finalSource,
  };
}

export function buildContractSiLcReport(contract: Contract, customer: Customer): ContractSiLcReport {
  const companyConfiguration = resolveCompanyConfiguration(contract.orgId);
  const parity = computeContractExcelParity(contract.terms, companyConfiguration);
  const certNo = generateCertificateRange(contract.terms.lastCertNo ?? 0, parity.containerCount);
  const cropYear = clean(contract.terms.cropYear) || String(new Date().getUTCFullYear());
  const packagingAndMarking = buildPackagingAndMarkingLabel({
    bagCount: parity.noOfBags || contract.terms.quantityBags,
    netWeightKgPerBag: resolvePackagingNetWeightKg(contract.terms, companyConfiguration),
  });

  const rows: ContractSiLcRow[] = [
    makeRow({
      rowNumber: 7,
      label: "Coffee Type",
      contractValue: clean(contract.terms.quality),
      shippingValue: clean(contract.shipping.qualityValue),
      revisedShippingValue: "",
      lcValue: "",
      revisedLcValue: "",
    }),
    makeRow({
      rowNumber: 8,
      label: "Buyers Name",
      contractValue: clean(customer.name),
      shippingValue: "",
      revisedShippingValue: "",
      lcValue: "",
      revisedLcValue: "",
    }),
    makeRow({
      rowNumber: 9,
      label: "Buyers Address",
      contractValue: clean(customer.address),
      shippingValue: "",
      revisedShippingValue: "",
      lcValue: "",
      revisedLcValue: "",
    }),
    makeRow({
      rowNumber: 10,
      label: "UoM(Packing)",
      contractValue: clean(contract.terms.packagingUnit),
      shippingValue: "",
      revisedShippingValue: "",
      lcValue: "",
      revisedLcValue: "",
    }),
    makeRow({
      rowNumber: 11,
      label: "Quantity(Contract)",
      contractValue: clean(contract.terms.quantityBags),
      shippingValue: clean(contract.shipping.quantityValue),
      revisedShippingValue: "",
      lcValue: "",
      revisedLcValue: "",
    }),
    makeRow({
      rowNumber: 12,
      label: "Total Price",
      contractValue: formatGroupedFixed(parity.totalPrice, MONEY_DP),
      shippingValue: "",
      revisedShippingValue: "",
      lcValue: clean(contract.banking.currencyAmount),
      revisedLcValue: "",
    }),
    makeRow({
      rowNumber: 13,
      label: "ORIGIN",
      contractValue: clean(contract.terms.origin),
      shippingValue: "",
      revisedShippingValue: "",
      lcValue: "",
      revisedLcValue: "",
    }),
    makeRow({
      rowNumber: 14,
      label: "GRADE",
      contractValue: clean(contract.terms.grade),
      shippingValue: "",
      revisedShippingValue: "",
      lcValue: "",
      revisedLcValue: "",
    }),
    makeRow({
      rowNumber: 15,
      label: "Date of Shipment",
      contractValue: clean(contract.terms.shipmentPeriod),
      shippingValue: clean(contract.shipping.shipmentMonth),
      revisedShippingValue: "",
      lcValue: "",
      revisedLcValue: "",
    }),
    makeRow({
      rowNumber: 16,
      label: "Payment Term",
      contractValue: clean(contract.terms.paymentTerm),
      shippingValue: "",
      revisedShippingValue: "",
      lcValue: "",
      revisedLcValue: "",
    }),
    makeRow({
      rowNumber: 17,
      label: "Delivery Term",
      contractValue: clean(contract.terms.deliveryTerm),
      shippingValue: "",
      revisedShippingValue: "",
      lcValue: "",
      revisedLcValue: "",
    }),
    makeRow({
      rowNumber: 18,
      label: "Cert No",
      contractValue: clean(certNo),
      shippingValue: "",
      revisedShippingValue: "",
      lcValue: "",
      revisedLcValue: "",
    }),
    makeRow({
      rowNumber: 20,
      label: "Destination( Port, Country)",
      contractValue: "",
      shippingValue: clean(contract.shipping.destinationPort),
      revisedShippingValue: "",
      lcValue: clean(contract.banking.portOfDischarge),
      revisedLcValue: "",
    }),
    makeRow({
      rowNumber: 21,
      label: "Shipping Line",
      contractValue: "",
      shippingValue: clean(contract.shipping.shippingLine),
      revisedShippingValue: "",
      lcValue: "",
      revisedLcValue: "",
    }),
    makeRow({
      rowNumber: 22,
      label: "Alternative 1",
      contractValue: "",
      shippingValue: clean(contract.shipping.alternative1),
      revisedShippingValue: "",
      lcValue: "",
      revisedLcValue: "",
    }),
    makeRow({
      rowNumber: 23,
      label: "Alternative 2",
      contractValue: "",
      shippingValue: clean(contract.shipping.alternative2),
      revisedShippingValue: "",
      lcValue: "",
      revisedLcValue: "",
    }),
    makeRow({
      rowNumber: 24,
      label: "Port of Loading",
      contractValue: "",
      shippingValue: clean(contract.shipping.portOfLoading),
      revisedShippingValue: "",
      lcValue: clean(contract.banking.portOfLoading),
      revisedLcValue: "",
    }),
    makeRow({
      rowNumber: 25,
      label: "No of Bags",
      contractValue: "",
      shippingValue: clean(contract.shipping.noOfBagsValue),
      revisedShippingValue: "",
      lcValue: clean(contract.banking.noOfBags),
      revisedLcValue: "",
    }),
    makeRow({
      rowNumber: 27,
      label: "Bag Marking",
      contractValue: "",
      shippingValue: clean(contract.shipping.bagMarkings),
      revisedShippingValue: "",
      lcValue: "",
      revisedLcValue: "",
    }),
    makeRow({
      rowNumber: 28,
      label: "Description",
      contractValue: "",
      shippingValue: clean(contract.shipping.description),
      revisedShippingValue: "",
      lcValue: clean(contract.banking.goodsDescription),
      revisedLcValue: "",
    }),
    makeRow({
      rowNumber: 29,
      label: "Consignee",
      contractValue: "",
      shippingValue: clean(contract.shipping.consignee),
      revisedShippingValue: clean(contract.shipping.revisedConsignee),
      lcValue: clean(contract.banking.consignee),
      revisedLcValue: clean(contract.banking.revisedConsignee),
    }),
    makeRow({
      rowNumber: 30,
      label: "Notify",
      contractValue: "",
      shippingValue: clean(contract.shipping.notifyParty),
      revisedShippingValue: clean(contract.shipping.revisedNotifyParty),
      lcValue: clean(contract.banking.notify),
      revisedLcValue: clean(contract.banking.revisedNotify),
    }),
    makeRow({
      rowNumber: 31,
      label: "Applicant",
      contractValue: "",
      shippingValue: "",
      revisedShippingValue: "",
      lcValue: clean(contract.banking.notify),
      revisedLcValue: clean(contract.banking.revisedNotify),
    }),
    makeRow({
      rowNumber: 32,
      label: "2nd Notify",
      contractValue: "",
      shippingValue: clean(contract.shipping.secondNotify),
      revisedShippingValue: clean(contract.shipping.revisedSecondNotify),
      lcValue: clean(contract.banking.secondNotify),
      revisedLcValue: clean(contract.banking.revisedSecondNotify),
    }),
    makeRow({
      rowNumber: 35,
      label: "PACKAGING & MARKING",
      contractValue: clean(packagingAndMarking),
      shippingValue: clean(contract.shipping.bagMarkings),
      revisedShippingValue: "",
      lcValue: "",
      revisedLcValue: "",
    }),
    makeRow({
      rowNumber: 37,
      label: "CROP YEAR",
      contractValue: clean(cropYear),
      shippingValue: "",
      revisedShippingValue: "",
      lcValue: "",
      revisedLcValue: "",
    }),
  ];

  return {
    contractId: contract.id,
    contractNumber: contract.contractNumber,
    customerName: customer.name,
    precedence: "Revised LC (J) > LC (I) > Revised SI (H) > SI (G) > Contract (F)",
    rows,
  };
}

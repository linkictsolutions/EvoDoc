import {
  bankLcInputSchema,
  contractCoreInputSchema,
  contractInputSchema,
  shippingInstructionInputSchema,
} from "@/domain/schemas";
import { computeContractExcelParity } from "@/domain/excel-parity";
import type {
  BankingPaymentInfo,
  Contract,
  Customer,
  ShippingInstructions,
} from "@/types/models";

function nowIso(): string {
  return new Date().toISOString();
}

export interface NormalizedContractPayload {
  customer: Omit<Customer, "id" | "createdAt" | "updatedAt">;
  contract: Omit<Contract, "id" | "createdAt" | "updatedAt" | "customerId">;
}

export interface NormalizedContractCorePayload {
  customer: Omit<Customer, "id" | "createdAt" | "updatedAt">;
  contract: Omit<Contract, "id" | "createdAt" | "updatedAt" | "customerId">;
}

export interface NormalizedShippingInstructionPayload {
  shipping: ShippingInstructions;
}

export interface NormalizedBankLcPayload {
  banking: BankingPaymentInfo;
}

function cleanOptional(value?: string): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .map((entry) => stripUndefinedDeep(entry))
      .filter((entry) => entry !== undefined) as T;
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entry]) => entry !== undefined)
        .map(([key, entry]) => [key, stripUndefinedDeep(entry)]),
    ) as T;
  }

  return value;
}

export function validateAndNormalizeContractPayload(input: unknown): NormalizedContractPayload {
  const parsed = contractInputSchema.parse(input);
  const derived = computeContractExcelParity(parsed.contract.terms);

  return {
    customer: {
      orgId: parsed.orgId,
      name: parsed.customer.name.trim(),
      address: parsed.customer.address.trim(),
      country: parsed.customer.country.trim(),
      contactName: cleanOptional(parsed.customer.contactName),
      contactEmail: cleanOptional(parsed.customer.contactEmail),
      taxId: cleanOptional(parsed.customer.taxId),
    },
    contract: {
      orgId: parsed.orgId,
      contractNumber: parsed.contract.contractNumber.trim(),
      status: parsed.contract.status,
      terms: parsed.contract.terms,
      shipping: parsed.contract.shipping,
      banking: parsed.contract.banking,
      processing: parsed.contract.processing,
      derived: {
        totalPrice: derived.totalPrice,
        quantityKg: derived.quantityKg,
        quantityLb: derived.quantityLb,
        quantityMt: derived.quantityMt,
        grossWeightKg: derived.grossWeightKg,
        grossWeightMt: derived.grossWeightMt,
        containerCount: derived.containerCount,
        noOfBags: derived.noOfBags,
      },
      createdBy: "",
    },
  };
}

export function validateAndNormalizeContractCorePayload(
  input: unknown,
): NormalizedContractCorePayload {
  const parsed = contractCoreInputSchema.parse(input);
  const derived = computeContractExcelParity(parsed.contract.terms);

  return {
    customer: {
      orgId: parsed.orgId,
      name: parsed.customer.name.trim(),
      address: parsed.customer.address.trim(),
      country: parsed.customer.country.trim(),
      contactName: cleanOptional(parsed.customer.contactName),
      contactEmail: cleanOptional(parsed.customer.contactEmail),
      taxId: cleanOptional(parsed.customer.taxId),
    },
    contract: {
      orgId: parsed.orgId,
      contractNumber: parsed.contract.contractNumber.trim(),
      status: parsed.contract.status,
      terms: parsed.contract.terms,
      shipping: {
        destinationPort: "",
        shippingLine: "",
        portOfLoading: "",
      },
      banking: {
        lcNumber: "",
        permitNumber: "",
        sender: "",
        receiver: "",
        applicant: "",
        portOfLoading: "",
        portOfDischarge: "",
        latestShipmentDate: "",
        goodsDescription: "",
        noOfBags: "",
        consignee: "",
        notify: "",
        secondNotify: "",
        currencyAmount: "",
        revisedConsignee: "",
        revisedNotify: "",
        revisedSecondNotify: "",
        beneficiaryBank: "",
        bankAddress: "",
        correspondentBank: "",
        beneficiaryAccountNumber: "",
        accountNumber: "",
        swiftCode: "",
      },
      processing: {
        stationName: "",
        stationAddress: "",
        moisturePercent: 0,
      },
      derived: {
        totalPrice: derived.totalPrice,
        quantityKg: derived.quantityKg,
        quantityLb: derived.quantityLb,
        quantityMt: derived.quantityMt,
        grossWeightKg: derived.grossWeightKg,
        grossWeightMt: derived.grossWeightMt,
        containerCount: derived.containerCount,
        noOfBags: derived.noOfBags,
      },
      createdBy: "",
    },
  };
}

export function validateAndNormalizeShippingInstructionPayload(
  input: unknown,
): NormalizedShippingInstructionPayload {
  const parsed = shippingInstructionInputSchema.parse(input);

  return {
    shipping: {
      destinationPort: parsed.shipping.destinationPort.trim(),
      shippingLine: parsed.shipping.shippingLine.trim(),
      serviceContract: cleanOptional(parsed.shipping.serviceContract),
      alternative1: cleanOptional(parsed.shipping.alternative1),
      alternative1ServiceContract: cleanOptional(parsed.shipping.alternative1ServiceContract),
      alternative1Selected: false,
      alternative2: cleanOptional(parsed.shipping.alternative2),
      alternative2ServiceContract: cleanOptional(parsed.shipping.alternative2ServiceContract),
      portOfLoading: parsed.shipping.portOfLoading.trim(),
      quantityValue: cleanOptional(parsed.shipping.quantityValue),
      qualityValue: cleanOptional(parsed.shipping.qualityValue),
      packagingValue: cleanOptional(parsed.shipping.packagingValue),
      noOfBagsValue: cleanOptional(parsed.shipping.noOfBagsValue),
      containerCountValue: cleanOptional(parsed.shipping.containerCountValue),
      shipmentMonth: cleanOptional(parsed.shipping.shipmentMonth),
      bagMarkings: cleanOptional(parsed.shipping.bagMarkings),
      description: cleanOptional(parsed.shipping.description),
      vesselName: cleanOptional(parsed.shipping.vesselName),
      bookingNumber: cleanOptional(parsed.shipping.bookingNumber),
      consignee: cleanOptional(parsed.shipping.consignee),
      notifyParty: cleanOptional(parsed.shipping.notifyParty),
      secondNotify: cleanOptional(parsed.shipping.secondNotify),
      // Keep revised fields synchronized for backward compatibility with existing precedence logic.
      revisedConsignee: cleanOptional(parsed.shipping.consignee),
      revisedNotifyParty: cleanOptional(parsed.shipping.notifyParty),
      revisedSecondNotify: cleanOptional(parsed.shipping.secondNotify),
    },
  };
}

export function validateAndNormalizeBankLcPayload(input: unknown): NormalizedBankLcPayload {
  const parsed = bankLcInputSchema.parse(input);

  return {
    banking: {
      lcNumber: cleanOptional(parsed.banking.lcNumber),
      permitNumber: cleanOptional(parsed.banking.permitNumber),
      sender: cleanOptional(parsed.banking.sender),
      receiver: cleanOptional(parsed.banking.receiver),
      applicant: cleanOptional(parsed.banking.applicant),
      portOfLoading: cleanOptional(parsed.banking.portOfLoading),
      portOfDischarge: cleanOptional(parsed.banking.portOfDischarge),
      latestShipmentDate: cleanOptional(parsed.banking.latestShipmentDate),
      goodsDescription: cleanOptional(parsed.banking.goodsDescription),
      noOfBags: cleanOptional(parsed.banking.noOfBags),
      consignee: cleanOptional(parsed.banking.consignee),
      notify: cleanOptional(parsed.banking.notify),
      secondNotify: cleanOptional(parsed.banking.secondNotify),
      currencyAmount: cleanOptional(parsed.banking.currencyAmount),
      // Keep revised fields synchronized for backward compatibility with existing precedence logic.
      revisedConsignee: cleanOptional(parsed.banking.consignee),
      revisedNotify: cleanOptional(parsed.banking.notify),
      revisedSecondNotify: cleanOptional(parsed.banking.secondNotify),
      beneficiaryBank: cleanOptional(parsed.banking.beneficiaryBank),
      bankAddress: cleanOptional(parsed.banking.bankAddress),
      correspondentBank: cleanOptional(parsed.banking.correspondentBank),
      beneficiaryAccountNumber: cleanOptional(parsed.banking.beneficiaryAccountNumber),
      accountNumber: cleanOptional(parsed.banking.accountNumber),
      swiftCode: cleanOptional(parsed.banking.swiftCode),
    },
  };
}

export function withTimestamps<T extends object>(data: T, existing?: { createdAt?: string }): T & {
  createdAt: string;
  updatedAt: string;
} {
  const timestamp = nowIso();

  return stripUndefinedDeep({
    ...data,
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  });
}

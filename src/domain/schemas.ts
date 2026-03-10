import { z } from "zod";

export const contractTermsSchema = z.object({
  quality: z.string().min(1),
  origin: z.string().min(1),
  grade: z.string().min(1),
  quantityBags: z.number().int().nonnegative(),
  bagWeightKg: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  currency: z.string().min(1),
  packagingUnit: z.string().min(1),
  priceUom: z.string().default("Lbs"),
  priceUnitForPrice: z.number().positive().default(100),
  shipmentPeriod: z.string().optional(),
  paymentTerm: z.string().default("CAD"),
  deliveryTerm: z.string().default("F.O.B"),
  cropYear: z.string().optional(),
  lastCertNo: z.number().int().nonnegative().default(0),
});

export const shippingInstructionsSchema = z.object({
  destinationPort: z.string().min(1),
  shippingLine: z.string().min(1),
  serviceContract: z.string().optional(),
  alternative1: z.string().optional(),
  alternative1ServiceContract: z.string().optional(),
  alternative1Selected: z.boolean().optional(),
  alternative2: z.string().optional(),
  alternative2ServiceContract: z.string().optional(),
  portOfLoading: z.string().min(1),
  quantityValue: z.string().optional(),
  qualityValue: z.string().optional(),
  packagingValue: z.string().optional(),
  noOfBagsValue: z.string().optional(),
  containerCountValue: z.string().optional(),
  shipmentMonth: z.string().optional(),
  bagMarkings: z.string().optional(),
  description: z.string().optional(),
  vesselName: z.string().optional(),
  bookingNumber: z.string().optional(),
  consignee: z.string().optional(),
  revisedConsignee: z.string().optional(),
  notifyParty: z.string().optional(),
  revisedNotifyParty: z.string().optional(),
  secondNotify: z.string().optional(),
  revisedSecondNotify: z.string().optional(),
});

export const bankingPaymentInfoSchema = z.object({
  lcNumber: z.string().optional(),
  permitNumber: z.string().optional(),
  sender: z.string().optional(),
  receiver: z.string().optional(),
  applicant: z.string().optional(),
  portOfLoading: z.string().optional(),
  portOfDischarge: z.string().optional(),
  latestShipmentDate: z.string().optional(),
  goodsDescription: z.string().optional(),
  noOfBags: z.string().optional(),
  consignee: z.string().optional(),
  notify: z.string().optional(),
  secondNotify: z.string().optional(),
  currencyAmount: z.string().optional(),
  revisedConsignee: z.string().optional(),
  revisedNotify: z.string().optional(),
  revisedSecondNotify: z.string().optional(),
  beneficiaryBank: z.string().optional(),
  bankAddress: z.string().optional(),
  correspondentBank: z.string().optional(),
  beneficiaryAccountNumber: z.string().optional(),
  accountNumber: z.string().optional(),
  swiftCode: z.string().optional(),
});

export const processingInfoSchema = z.object({
  stationName: z.string().min(1),
  stationAddress: z.string().min(1),
  moisturePercent: z.number().nonnegative(),
});

export const contractInputSchema = z.object({
  orgId: z.string().min(1),
  contractId: z.string().optional(),
  customer: z.object({
    id: z.string().optional(),
    name: z.string().min(1),
    shortName: z.string().optional(),
    address: z.string().min(1),
    country: z.string().min(1),
    contactName: z.string().optional(),
    contactEmail: z.string().email().optional().or(z.literal("")),
    taxId: z.string().optional(),
  }),
  contract: z.object({
    contractNumber: z.string().min(1),
    customerId: z.string().optional(),
    status: z.enum(["draft", "active", "closed"]).default("draft"),
    terms: contractTermsSchema,
    shipping: shippingInstructionsSchema,
    banking: bankingPaymentInfoSchema,
    processing: processingInfoSchema,
  }),
});

export const contractCoreInputSchema = z.object({
  orgId: z.string().min(1),
  contractId: z.string().optional(),
  customer: z.object({
    id: z.string().optional(),
    name: z.string().min(1),
    shortName: z.string().optional(),
    address: z.string().min(1),
    country: z.string().min(1),
    contactName: z.string().optional(),
    contactEmail: z.string().email().optional().or(z.literal("")),
    taxId: z.string().optional(),
  }),
  contract: z.object({
    contractNumber: z.string().min(1),
    status: z.enum(["draft", "active", "closed"]).default("draft"),
    terms: contractTermsSchema,
  }),
});

export const shippingInstructionInputSchema = z.object({
  orgId: z.string().min(1),
  contractId: z.string().min(1),
  shipping: shippingInstructionsSchema,
});

export const bankLcInputSchema = z.object({
  orgId: z.string().min(1),
  contractId: z.string().min(1),
  banking: bankingPaymentInfoSchema,
});

export const customerMasterInputSchema = z.object({
  orgId: z.string().min(1),
  customerId: z.string().optional(),
  customer: z.object({
    name: z.string().min(1),
    shortName: z.string().optional(),
    address: z.string().min(1),
    country: z.string().min(1),
    contactName: z.string().optional(),
    contactEmail: z.string().email().optional().or(z.literal("")),
    taxId: z.string().optional(),
  }),
});

export const itemMasterInputSchema = z.object({
  orgId: z.string().min(1),
  itemId: z.string().optional(),
  item: z.object({
    itemCode: z.string().min(1),
    name: z.string().min(1),
    description: z.string().optional(),
    hsCode: z.string().optional(),
    origin: z.string().optional(),
    grade: z.string().optional(),
    defaultPackagingUnit: z.string().optional(),
    defaultBagWeightKg: z.number().nonnegative().optional(),
    active: z.boolean().default(true),
  }),
});

export const bookingLineSchema = z.object({
  lineNo: z.number().int().positive(),
  truckNumber: z.string().optional(),
  containerNumber: z.string().optional(),
  sealNumber: z.string().optional(),
  bags: z.number().int().nonnegative(),
  grossWeightKg: z.number().nonnegative(),
  tareWeightKg: z.number().nonnegative(),
});

export const shipmentInputSchema = z.object({
  orgId: z.string().min(1),
  shipmentId: z.string().optional(),
  contractId: z.string().min(1),
  shipment: z.object({
    status: z.enum(["draft", "ready"]).default("draft"),
    vessel: z.string().optional(),
    voyageNo: z.string().optional(),
    bookingReference: z.string().optional(),
    bookingLines: z.array(bookingLineSchema).min(1),
  }),
});

export const generateDocumentSchema = z.object({
  orgId: z.string().min(1),
  contractId: z.string().min(1),
  shipmentId: z.string().optional(),
  docType: z.enum(["invoice", "packing_list", "shipping_instructions"]),
  docVariant: z.enum(["permit", "final", "standard"]).optional(),
  templateVersion: z.string().default("v1"),
});

export const submitReviewSchema = z.object({
  orgId: z.string().min(1),
  contractId: z.string().min(1),
});

export const decisionSchema = z.object({
  orgId: z.string().min(1),
  contractId: z.string().min(1),
  decision: z.enum(["approve", "reject"]),
  comment: z.string().min(1),
});

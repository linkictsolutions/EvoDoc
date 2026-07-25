import { z } from "zod";

const contractNumberSchema = z.string().min(1).refine(
  (value) => !value.includes("/"),
  { message: "Contract number cannot contain '/'." },
);

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
  beneficiarySwiftCode: z.string().optional(),
  correspondentBank: z.string().optional(),
  correspondentBankAddress: z.string().optional(),
  beneficiaryAccountNumber: z.string().optional(),
  accountNumber: z.string().optional(),
  swiftCode: z.string().optional(),
  correspondentSwiftCode: z.string().optional(),
});

export const processingInfoSchema = z.object({
  stationName: z.string().min(1),
  stationAddress: z.string().min(1),
  moisturePercent: z.number().nonnegative(),
});

export const billOfLadingInfoSchema = z.object({
  billType: z.enum(["ORIGINAL BILL No.", "WAYBILL No."]).optional(),
  billNo: z.string().optional(),
  noOfCopyBills: z.string().optional(),
  shipperReferenceType: z.enum(["Booking Ref", "Shipper Ref."]).optional(),
  shipperReferenceValue: z.string().optional(),
  placeOfReceipt: z.string().optional(),
  placeOfDelivery: z.string().optional(),
  shippedOnBoardDate: z.string().optional(),
  placeAndDateOfIssue: z.string().optional(),
  carrierAgentsEndorsements: z.string().optional(),
  notify2: z.string().optional(),
  notify3: z.string().optional(),
  declaredValue: z.string().optional(),
  freightAndChargesText: z.string().optional(),
  measurement: z.string().optional(),
  cargoMarksText: z.string().optional(),
  descriptionOverride: z.string().optional(),
  movementType: z.string().optional(),
  freightParty: z.string().optional(),
  riderDescriptions: z.array(z.string().min(1)).optional(),
});

export const contractInputSchema = z.object({
  orgId: z.string().min(1),
  contractId: z.string().optional(),
  customer: z.object({
    id: z.string().optional(),
    name: z.string().min(1),
    address: z.string().min(1),
    country: z.string().min(1),
    contactName: z.string().optional(),
    contactEmail: z.string().email().optional().or(z.literal("")),
    taxId: z.string().optional(),
  }),
  contract: z.object({
    contractNumber: contractNumberSchema,
    customerId: z.string().optional(),
    status: z.enum(["draft", "active", "closed"]).default("draft"),
    terms: contractTermsSchema,
    shipping: shippingInstructionsSchema,
    banking: bankingPaymentInfoSchema,
    billOfLading: billOfLadingInfoSchema.optional(),
    processing: processingInfoSchema,
  }),
});

export const contractCoreInputSchema = z.object({
  orgId: z.string().min(1),
  contractId: z.string().optional(),
  attachments: z.array(z.object({
    id: z.string().min(1),
    fileName: z.string().min(1),
    mimeType: z.string().min(1),
    sizeBytes: z.number().int().nonnegative(),
    storagePath: z.string().min(1),
    downloadUrl: z.string().url(),
    uploadedAt: z.string().min(1),
  })).optional(),
  customer: z.object({
    id: z.string().optional(),
    name: z.string().min(1),
    address: z.string().min(1),
    country: z.string().min(1),
    contactName: z.string().optional(),
    contactEmail: z.string().email().optional().or(z.literal("")),
    taxId: z.string().optional(),
  }),
  contract: z.object({
    contractNumber: contractNumberSchema,
    status: z.enum(["draft", "active", "closed"]).default("draft"),
    terms: contractTermsSchema,
  }),
});

export const shippingInstructionInputSchema = z.object({
  orgId: z.string().min(1),
  contractId: z.string().min(1),
  attachments: z.array(z.object({
    id: z.string().min(1),
    fileName: z.string().min(1),
    mimeType: z.string().min(1),
    sizeBytes: z.number().int().nonnegative(),
    storagePath: z.string().min(1),
    downloadUrl: z.string().url(),
    uploadedAt: z.string().min(1),
  })).optional(),
  shipping: shippingInstructionsSchema,
});

export const bankLcInputSchema = z.object({
  orgId: z.string().min(1),
  contractId: z.string().min(1),
  attachments: z.array(z.object({
    id: z.string().min(1),
    fileName: z.string().min(1),
    mimeType: z.string().min(1),
    sizeBytes: z.number().int().nonnegative(),
    storagePath: z.string().min(1),
    downloadUrl: z.string().url(),
    uploadedAt: z.string().min(1),
  })).optional(),
  banking: bankingPaymentInfoSchema,
});

export const billOfLadingInputSchema = z.object({
  orgId: z.string().min(1),
  contractId: z.string().min(1),
  attachments: z.array(z.object({
    id: z.string().min(1),
    fileName: z.string().min(1),
    mimeType: z.string().min(1),
    sizeBytes: z.number().int().nonnegative(),
    storagePath: z.string().min(1),
    downloadUrl: z.string().url(),
    uploadedAt: z.string().min(1),
  })).optional(),
  billOfLading: billOfLadingInfoSchema.extend({
    movementType: z.string().min(1),
    freightParty: z.string().min(1),
  }),
});

export const customerMasterInputSchema = z.object({
  orgId: z.string().min(1),
  customerId: z.string().optional(),
  customer: z.object({
    name: z.string().min(1),
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

export const companyConfigurationInputSchema = z.object({
  orgId: z.string().min(1),
  companyConfiguration: z.object({
    sellerName: z.string().min(1),
    sellerAddress: z.string().min(1),
    sellerAmharicName: z.string().optional(),
    companyEmail: z.string().email().optional().or(z.literal("")),
    companyPhone: z.string().optional(),
    defaultOrigin: z.string().min(1),
    defaultHsCode: z.string().min(1),
    icoReferencePrefix: z.string().min(1),
    placeOfIssue: z.string().min(1),
    transitorCompanyName: z.string().optional(),
    transitorPhoneNumber: z.string().optional(),
    transitorLocation: z.string().optional(),
    currencies: z.array(z.string().min(1)).min(1).optional(),
    paymentTerms: z.array(z.string().min(1)).min(1),
    deliveryTerms: z.array(z.string().min(1)).min(1),
    priceUoms: z.array(z.string().min(1)).min(1),
    packagingUnits: z.array(z.string().min(1)).min(1).optional(),
    movementTypes: z.array(z.string().min(1)).min(1).optional(),
    containerTypes: z.array(z.string().min(1)).optional(),
    shippingLines: z.array(z.string().min(1)).optional(),
    processingEnabled: z.boolean().optional(),
    staffingShowDoNumber: z.boolean().optional(),
    documentBranding: z.object({
      header: z.object({
        imageDataUrl: z.string().optional(),
        heightMm: z.number().positive(),
        fit: z.enum(["cover", "contain"]),
        positionXPercent: z.number().min(0).max(100),
        positionYPercent: z.number().min(0).max(100),
      }),
      footer: z.object({
        imageDataUrl: z.string().optional(),
        heightMm: z.number().positive(),
        fit: z.enum(["cover", "contain"]),
        positionXPercent: z.number().min(0).max(100),
        positionYPercent: z.number().min(0).max(100),
      }),
      applyByDocType: z.object({
        invoice: z.object({
          header: z.boolean(),
          footer: z.boolean(),
        }),
        packing_list: z.object({
          header: z.boolean(),
          footer: z.boolean(),
        }),
        shipping_instructions: z.object({
          header: z.boolean(),
          footer: z.boolean(),
        }),
        quality_certificate: z.object({
          header: z.boolean(),
          footer: z.boolean(),
        }),
        weight_certificate: z.object({
          header: z.boolean(),
          footer: z.boolean(),
        }),
        way_bill: z.object({
          header: z.boolean(),
          footer: z.boolean(),
        }),
        ico_certificate: z.object({
          header: z.boolean(),
          footer: z.boolean(),
        }),
        bill_of_lading: z.object({
          header: z.boolean(),
          footer: z.boolean(),
        }),
      }),
    }),
    bulkReferenceKg: z.number().positive(),
    beneficiaryBanks: z.array(z.object({
      beneficiaryBank: z.string().min(1),
      beneficiaryBankAddress: z.string().optional(),
      swiftNumber: z.string().optional(),
      beneficiaryAccountNumbers: z.array(z.string().min(1)).min(1),
    })).optional(),
    packagingDefinitions: z.array(z.object({
      label: z.string().min(1),
      uom: z.string().min(1),
      netWeightKg: z.number().positive(),
      tareWeightKg: z.number().nonnegative(),
      grossWeightKg: z.number().positive(),
    })).min(1),
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

const vehicleKindSchema = z.enum(["TRUCK", "TRAILER"]);

export const bookingEntrySchema = z.object({
  rowNo: z.number().int().positive(),
  vehicleNo: z.number().int().positive().optional(),
  vehicleType: vehicleKindSchema,
  plateNo: z.string().optional(),
  driverName: z.string().optional(),
  driverPhoneNo: z.string().optional(),
  djiboutiPhoneNo: z.string().optional(),
  licenseNo: z.string().optional(),
  containerNumber: z.string().optional(),
  containerType: z.string().optional(),
  sealNumber: z.string().optional(),
  secondSealNumber: z.string().optional(),
  tareWeightKg: z.number().nonnegative().optional(),
});

export const bookingsSheetInputSchema = z.object({
  orgId: z.string().min(1),
  contractId: z.string().min(1),
  bookings: z.object({
    bookingNumber: z.string().optional(),
    shippingLine: z.string().optional(),
    vesselName: z.string().optional(),
    voyageNo: z.string().optional(),
    freeDays: z.string().optional(),
    billOfLadingNumber: z.string().optional(),
    hasSecondSeal: z.boolean().optional(),
    entries: z.array(bookingEntrySchema).min(1),
  }),
});

export const staffingInstructionRowSchema = z.object({
  rowNo: z.number().int().positive(),
  vehicleNo: z.number().int().positive().optional(),
  vehicleType: vehicleKindSchema,
  plateNo: z.string().optional(),
  driverName: z.string().optional(),
  driverPhoneNo: z.string().optional(),
  licenseNo: z.string().optional(),
  containerNumber: z.string().optional(),
  sealNumber: z.string().optional(),
  certNumber: z.string().optional(),
  tareWeightKg: z.number().nonnegative().optional(),
  firstWeightKg: z.number().nonnegative().optional(),
  secondWeightKg: z.number().nonnegative().optional(),
  netWeightKg: z.number().nonnegative().optional(),
  doNumber: z.string().optional(),
});

export const staffingSheetInputSchema = z.object({
  orgId: z.string().min(1),
  contractId: z.string().min(1),
  staffing: z.object({
    instructionRows: z.array(staffingInstructionRowSchema).min(1),
    showDoNumber: z.boolean().optional(),
  }),
});

export const processingSheetInputSchema = z.object({
  orgId: z.string().min(1),
  contractId: z.string().min(1),
  processing: z.object({
    moisturePercent: z.number().nonnegative(),
    stationName: z.string().min(1),
    stationNameLocal: z.string().optional(),
    stationAddress: z.string().min(1),
  }),
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
  docType: z.enum([
    "invoice",
    "packing_list",
    "shipping_instructions",
    "quality_certificate",
    "weight_certificate",
    "way_bill",
    "ico_certificate",
    "bill_of_lading",
  ]),
  docVariant: z.enum(["permit", "final", "standard"]).optional(),
  templateVersion: z.string().default("v1"),
  templateLayout: z.string().optional(),
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

export const documentTemplateInputSchema = z.object({
  orgId: z.string().min(1),
  docType: z.enum([
    "invoice",
    "packing_list",
    "shipping_instructions",
    "quality_certificate",
    "weight_certificate",
    "way_bill",
    "ico_certificate",
    "bill_of_lading",
  ]),
  name: z.string().min(1),
  layout: z.string().min(2),
});

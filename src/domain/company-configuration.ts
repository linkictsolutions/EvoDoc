import { companyConfigurationInputSchema } from "@/domain/schemas";
import type {
  BeneficiaryBankProfile,
  CompanyConfiguration,
  DocumentBrandingSettings,
  DocumentBrandingSlotSettings,
  PackagingDefinition,
} from "@/types/models";

const DEFAULT_PACKAGING_DEFINITIONS: PackagingDefinition[] = [
  {
    label: "Bag of 60Kg",
    uom: "Bag",
    netWeightKg: 60,
    tareWeightKg: 0.75,
    grossWeightKg: 60.75,
  },
  {
    label: "Bag of 50Kg",
    uom: "Bag",
    netWeightKg: 50,
    tareWeightKg: 0.625,
    grossWeightKg: 50.625,
  },
  {
    label: "Bag of 30Kg",
    uom: "Bag",
    netWeightKg: 30,
    tareWeightKg: 0.375,
    grossWeightKg: 30.375,
  },
];

function cleanOptional(value?: string): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

const DEFAULT_PAYMENT_TERMS = ["CAD", "LC", "Advance & CAD", "Advance"];
const DEFAULT_DELIVERY_TERMS = ["F.O.B"];
const DEFAULT_PRICE_UOMS = ["Lbs", "Bag of 60Kg", "Bag of 50Kg", "Bag of 30Kg", "Kg", "Metric Ton"];
const DEFAULT_CURRENCIES = ["USD"];
const DEFAULT_PACKAGING_UNITS = ["Bag of 60Kg", "Bag of 50Kg", "Bag of 30Kg", "Kg", "Lbs", "Metric Ton", "Bulk"];
const DEFAULT_MOVEMENT_TYPES = ["FCL/FCL", "CY/CY", "Port to Port", "Door to Port", "Port to Door"];
const DEFAULT_SHIPPING_LINES: string[] = [];
const MAX_BRANDING_IMAGE_DATA_URL_LENGTH = 950_000;
const MAX_BENEFICIARY_BANKS = 50;
const MAX_BENEFICIARY_ACCOUNTS_PER_BANK = 20;

const DEFAULT_DOCUMENT_BRANDING: DocumentBrandingSettings = {
  header: {
    heightMm: 24,
    fit: "contain",
    positionXPercent: 50,
    positionYPercent: 50,
  },
  footer: {
    heightMm: 20,
    fit: "contain",
    positionXPercent: 50,
    positionYPercent: 50,
  },
  applyByDocType: {
    invoice: { header: false, footer: false },
    packing_list: { header: false, footer: false },
    shipping_instructions: { header: false, footer: false },
    quality_certificate: { header: false, footer: false },
    weight_certificate: { header: false, footer: false },
    way_bill: { header: false, footer: false },
    ico_certificate: { header: false, footer: false },
    bill_of_lading: { header: false, footer: false },
  },
};

type LegacyPaymentTermFields = {
  paymentTermCad?: string;
  paymentTermLc?: string;
  paymentTermAdvanceCad?: string;
  paymentTermAdvance?: string;
};

type LegacyDeliveryTermFields = {
  deliveryTerm?: string;
};

function normalizePaymentTerms(terms?: string[]): string[] {
  const uniqueTerms = new Set<string>();

  for (const term of terms ?? []) {
    const normalized = term.trim();
    if (normalized) {
      uniqueTerms.add(normalized);
    }
  }

  return Array.from(uniqueTerms);
}

function resolvePaymentTerms(
  configuration?: Partial<CompanyConfiguration> | (Partial<CompanyConfiguration> & LegacyPaymentTermFields) | null,
): string[] {
  const fromList = normalizePaymentTerms(configuration?.paymentTerms);
  if (fromList.length > 0) {
    return fromList;
  }

  const legacy = configuration as LegacyPaymentTermFields | undefined;
  const fromLegacyFields = normalizePaymentTerms([
    legacy?.paymentTermCad ?? "",
    legacy?.paymentTermLc ?? "",
    legacy?.paymentTermAdvanceCad ?? "",
    legacy?.paymentTermAdvance ?? "",
  ]);

  if (fromLegacyFields.length > 0) {
    return fromLegacyFields;
  }

  return DEFAULT_PAYMENT_TERMS;
}

function resolveDeliveryTerms(
  configuration?:
    | Partial<CompanyConfiguration>
    | (Partial<CompanyConfiguration> & LegacyDeliveryTermFields)
    | null,
): string[] {
  const fromList = normalizePaymentTerms(configuration?.deliveryTerms);
  if (fromList.length > 0) {
    return fromList;
  }

  const legacy = configuration as LegacyDeliveryTermFields | undefined;
  const fromLegacyField = normalizePaymentTerms([legacy?.deliveryTerm ?? ""]);
  if (fromLegacyField.length > 0) {
    return fromLegacyField;
  }

  return DEFAULT_DELIVERY_TERMS;
}

function resolvePriceUoms(configuration?: Partial<CompanyConfiguration> | null): string[] {
  const fromList = normalizePaymentTerms(configuration?.priceUoms);
  if (fromList.length > 0) {
    return fromList;
  }

  return DEFAULT_PRICE_UOMS;
}

function resolveCurrencies(configuration?: Partial<CompanyConfiguration> | null): string[] {
  const fromList = normalizePaymentTerms(configuration?.currencies);
  if (fromList.length > 0) {
    return fromList;
  }

  return DEFAULT_CURRENCIES;
}

function resolvePackagingUnits(configuration?: Partial<CompanyConfiguration> | null): string[] {
  const fromList = normalizePaymentTerms(configuration?.packagingUnits);
  if (fromList.length > 0) {
    return fromList;
  }

  return DEFAULT_PACKAGING_UNITS;
}

function resolveShippingLines(configuration?: Partial<CompanyConfiguration> | null): string[] {
  const fromList = normalizePaymentTerms(configuration?.shippingLines);
  if (fromList.length > 0) {
    return fromList;
  }

  return DEFAULT_SHIPPING_LINES;
}

function resolveProcessingEnabled(configuration?: Partial<CompanyConfiguration> | null): boolean {
  return configuration?.processingEnabled ?? true;
}

function resolveMovementTypes(configuration?: Partial<CompanyConfiguration> | null): string[] {
  const fromList = normalizePaymentTerms(configuration?.movementTypes);
  if (fromList.length > 0) {
    return fromList;
  }

  return DEFAULT_MOVEMENT_TYPES;
}

function normalizeBeneficiaryBanks(value?: BeneficiaryBankProfile[] | null): BeneficiaryBankProfile[] {
  const banks: BeneficiaryBankProfile[] = [];
  const seenBanks = new Set<string>();

  for (const entry of value ?? []) {
    const bankName = entry.beneficiaryBank.trim();
    if (!bankName) {
      continue;
    }

    const bankKey = bankName.toLowerCase();
    if (seenBanks.has(bankKey)) {
      continue;
    }
    seenBanks.add(bankKey);

    const seenAccounts = new Set<string>();
    const accounts: string[] = [];

    for (const account of entry.beneficiaryAccountNumbers ?? []) {
      const normalized = account.trim();
      if (!normalized) {
        continue;
      }

      const accountKey = normalized.toLowerCase();
      if (seenAccounts.has(accountKey)) {
        continue;
      }
      seenAccounts.add(accountKey);
      accounts.push(normalized);

      if (accounts.length >= MAX_BENEFICIARY_ACCOUNTS_PER_BANK) {
        break;
      }
    }

    if (accounts.length === 0) {
      continue;
    }

    const address = entry.beneficiaryBankAddress?.trim();
    const swiftNumber = entry.swiftNumber?.trim();

    banks.push({
      beneficiaryBank: bankName,
      beneficiaryBankAddress: address ? address : undefined,
      swiftNumber: swiftNumber ? swiftNumber : undefined,
      beneficiaryAccountNumbers: accounts,
    });
    if (banks.length >= MAX_BENEFICIARY_BANKS) {
      break;
    }
  }

  return banks;
}

function normalizePackagingDefinition(
  definition: PackagingDefinition,
): PackagingDefinition {
  return {
    label: definition.label.trim(),
    uom: definition.uom.trim(),
    netWeightKg: definition.netWeightKg,
    tareWeightKg: definition.tareWeightKg,
    grossWeightKg: definition.grossWeightKg,
  };
}

function cleanImageDataUrl(value?: string): string | undefined {
  const normalized = value?.trim();
  if (!normalized) {
    return undefined;
  }

  if (!normalized.startsWith("data:image/")) {
    return undefined;
  }

  return normalized.slice(0, MAX_BRANDING_IMAGE_DATA_URL_LENGTH);
}

function normalizeBrandingSlot(
  slot: Partial<DocumentBrandingSlotSettings> | undefined,
  defaults: DocumentBrandingSlotSettings,
): DocumentBrandingSlotSettings {
  return {
    imageDataUrl: cleanImageDataUrl(slot?.imageDataUrl),
    heightMm: slot?.heightMm ?? defaults.heightMm,
    fit: slot?.fit ?? defaults.fit,
    positionXPercent: slot?.positionXPercent ?? defaults.positionXPercent,
    positionYPercent: slot?.positionYPercent ?? defaults.positionYPercent,
  };
}

function resolveDocumentBranding(
  configuration?: Partial<CompanyConfiguration> | null,
): DocumentBrandingSettings {
  return {
    header: normalizeBrandingSlot(configuration?.documentBranding?.header, DEFAULT_DOCUMENT_BRANDING.header),
    footer: normalizeBrandingSlot(configuration?.documentBranding?.footer, DEFAULT_DOCUMENT_BRANDING.footer),
    applyByDocType: {
      invoice: {
        header: configuration?.documentBranding?.applyByDocType?.invoice?.header
          ?? DEFAULT_DOCUMENT_BRANDING.applyByDocType.invoice.header,
        footer: configuration?.documentBranding?.applyByDocType?.invoice?.footer
          ?? DEFAULT_DOCUMENT_BRANDING.applyByDocType.invoice.footer,
      },
      packing_list: {
        header: configuration?.documentBranding?.applyByDocType?.packing_list?.header
          ?? DEFAULT_DOCUMENT_BRANDING.applyByDocType.packing_list.header,
        footer: configuration?.documentBranding?.applyByDocType?.packing_list?.footer
          ?? DEFAULT_DOCUMENT_BRANDING.applyByDocType.packing_list.footer,
      },
      shipping_instructions: {
        header: configuration?.documentBranding?.applyByDocType?.shipping_instructions?.header
          ?? DEFAULT_DOCUMENT_BRANDING.applyByDocType.shipping_instructions.header,
        footer: configuration?.documentBranding?.applyByDocType?.shipping_instructions?.footer
          ?? DEFAULT_DOCUMENT_BRANDING.applyByDocType.shipping_instructions.footer,
      },
      quality_certificate: {
        header: configuration?.documentBranding?.applyByDocType?.quality_certificate?.header
          ?? DEFAULT_DOCUMENT_BRANDING.applyByDocType.quality_certificate.header,
        footer: configuration?.documentBranding?.applyByDocType?.quality_certificate?.footer
          ?? DEFAULT_DOCUMENT_BRANDING.applyByDocType.quality_certificate.footer,
      },
      weight_certificate: {
        header: configuration?.documentBranding?.applyByDocType?.weight_certificate?.header
          ?? DEFAULT_DOCUMENT_BRANDING.applyByDocType.weight_certificate.header,
        footer: configuration?.documentBranding?.applyByDocType?.weight_certificate?.footer
          ?? DEFAULT_DOCUMENT_BRANDING.applyByDocType.weight_certificate.footer,
      },
      way_bill: {
        header: configuration?.documentBranding?.applyByDocType?.way_bill?.header
          ?? DEFAULT_DOCUMENT_BRANDING.applyByDocType.way_bill.header,
        footer: configuration?.documentBranding?.applyByDocType?.way_bill?.footer
          ?? DEFAULT_DOCUMENT_BRANDING.applyByDocType.way_bill.footer,
      },
      ico_certificate: {
        header: configuration?.documentBranding?.applyByDocType?.ico_certificate?.header
          ?? DEFAULT_DOCUMENT_BRANDING.applyByDocType.ico_certificate.header,
        footer: configuration?.documentBranding?.applyByDocType?.ico_certificate?.footer
          ?? DEFAULT_DOCUMENT_BRANDING.applyByDocType.ico_certificate.footer,
      },
      bill_of_lading: {
        header: configuration?.documentBranding?.applyByDocType?.bill_of_lading?.header
          ?? DEFAULT_DOCUMENT_BRANDING.applyByDocType.bill_of_lading.header,
        footer: configuration?.documentBranding?.applyByDocType?.bill_of_lading?.footer
          ?? DEFAULT_DOCUMENT_BRANDING.applyByDocType.bill_of_lading.footer,
      },
    },
  };
}

export function defaultCompanyConfiguration(orgId: string): CompanyConfiguration {
  return {
    orgId,
    sellerName: "PRAXIS INTERNATIONAL BUSINESS PLC",
    sellerAddress: "NIFAS SILK LAFTO SUB CITY, WOREDA 08, HOUSE NO 1986, ADDIS ABABA, ETHIOPIA.",
    sellerAmharicName: "ፕራክሲስ ኢንተርናሽናል ቢዝነስ ኅ/የ/የግ/ማህበር",
    companyEmail: "coffee@praxis.com.et",
    companyPhone: "0992454545",
    defaultOrigin: "ETHIOPIA",
    defaultHsCode: "09011100",
    icoReferencePrefix: "010/1116",
    placeOfIssue: "ADDIS ABABA, ETHIOPIA",
    transitorCompanyName: "ETHIOPIAN SHIPPING AND LOGISTICS SERVICES ENTERPRISE (ESLSE)",
    transitorPhoneNumber: "+25377384845/+253 77031882/+253 21380802",
    transitorLocation: "DJIBOUTI",
    currencies: DEFAULT_CURRENCIES,
    paymentTerms: DEFAULT_PAYMENT_TERMS,
    deliveryTerms: DEFAULT_DELIVERY_TERMS,
    priceUoms: DEFAULT_PRICE_UOMS,
    packagingUnits: DEFAULT_PACKAGING_UNITS,
    movementTypes: DEFAULT_MOVEMENT_TYPES,
    shippingLines: DEFAULT_SHIPPING_LINES,
    processingEnabled: true,
    documentBranding: DEFAULT_DOCUMENT_BRANDING,
    bulkReferenceKg: 19200,
    packagingDefinitions: DEFAULT_PACKAGING_DEFINITIONS,
    beneficiaryBanks: [],
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  };
}

export function resolveCompanyConfiguration(
  orgId: string,
  configuration?:
    | Partial<CompanyConfiguration>
    | (Partial<CompanyConfiguration> & LegacyPaymentTermFields & LegacyDeliveryTermFields)
    | null,
): CompanyConfiguration {
  const defaults = defaultCompanyConfiguration(orgId);

  return {
    ...defaults,
    ...configuration,
    sellerName: configuration?.sellerName?.trim() || defaults.sellerName,
    sellerAddress: configuration?.sellerAddress?.trim() || defaults.sellerAddress,
    sellerAmharicName: cleanOptional(configuration?.sellerAmharicName) ?? defaults.sellerAmharicName,
    companyEmail: cleanOptional(configuration?.companyEmail) ?? defaults.companyEmail,
    companyPhone: cleanOptional(configuration?.companyPhone) ?? defaults.companyPhone,
    defaultOrigin: configuration?.defaultOrigin?.trim() || defaults.defaultOrigin,
    defaultHsCode: configuration?.defaultHsCode?.trim() || defaults.defaultHsCode,
    icoReferencePrefix: configuration?.icoReferencePrefix?.trim() || defaults.icoReferencePrefix,
    placeOfIssue: configuration?.placeOfIssue?.trim() || defaults.placeOfIssue,
    transitorCompanyName: cleanOptional(configuration?.transitorCompanyName) ?? defaults.transitorCompanyName,
    transitorPhoneNumber: cleanOptional(configuration?.transitorPhoneNumber) ?? defaults.transitorPhoneNumber,
    transitorLocation: cleanOptional(configuration?.transitorLocation) ?? defaults.transitorLocation,
    currencies: resolveCurrencies(configuration),
    paymentTerms: resolvePaymentTerms(configuration),
    deliveryTerms: resolveDeliveryTerms(configuration),
    priceUoms: resolvePriceUoms(configuration),
    packagingUnits: resolvePackagingUnits(configuration),
    movementTypes: resolveMovementTypes(configuration),
    shippingLines: resolveShippingLines(configuration),
    processingEnabled: resolveProcessingEnabled(configuration),
    documentBranding: resolveDocumentBranding(configuration),
    bulkReferenceKg: configuration?.bulkReferenceKg ?? defaults.bulkReferenceKg,
    beneficiaryBanks: normalizeBeneficiaryBanks(configuration?.beneficiaryBanks),
    packagingDefinitions:
      configuration?.packagingDefinitions?.map(normalizePackagingDefinition) ??
      defaults.packagingDefinitions,
    createdAt: configuration?.createdAt ?? defaults.createdAt,
    updatedAt: configuration?.updatedAt ?? defaults.updatedAt,
  };
}

export interface NormalizedCompanyConfigurationPayload {
  companyConfiguration: Omit<CompanyConfiguration, "createdAt" | "updatedAt">;
}

export function validateAndNormalizeCompanyConfigurationPayload(
  input: unknown,
): NormalizedCompanyConfigurationPayload {
  const parsed = companyConfigurationInputSchema.parse(input);
  const normalized = resolveCompanyConfiguration(parsed.orgId, parsed.companyConfiguration);

  return {
    companyConfiguration: {
      orgId: parsed.orgId,
      sellerName: normalized.sellerName,
      sellerAddress: normalized.sellerAddress,
      sellerAmharicName: cleanOptional(normalized.sellerAmharicName),
      companyEmail: cleanOptional(normalized.companyEmail),
      companyPhone: cleanOptional(normalized.companyPhone),
      defaultOrigin: normalized.defaultOrigin,
      defaultHsCode: normalized.defaultHsCode,
      icoReferencePrefix: normalized.icoReferencePrefix,
      placeOfIssue: normalized.placeOfIssue,
      transitorCompanyName: cleanOptional(normalized.transitorCompanyName),
      transitorPhoneNumber: cleanOptional(normalized.transitorPhoneNumber),
      transitorLocation: cleanOptional(normalized.transitorLocation),
      currencies: normalizePaymentTerms(normalized.currencies),
      paymentTerms: normalizePaymentTerms(normalized.paymentTerms),
      deliveryTerms: normalizePaymentTerms(normalized.deliveryTerms),
      priceUoms: normalizePaymentTerms(normalized.priceUoms),
      packagingUnits: normalizePaymentTerms(normalized.packagingUnits),
      movementTypes: normalizePaymentTerms(normalized.movementTypes),
      shippingLines: normalizePaymentTerms(normalized.shippingLines),
      processingEnabled: normalized.processingEnabled,
      documentBranding: resolveDocumentBranding(normalized),
      bulkReferenceKg: normalized.bulkReferenceKg,
      beneficiaryBanks: normalizeBeneficiaryBanks(normalized.beneficiaryBanks),
      packagingDefinitions: normalized.packagingDefinitions.map(normalizePackagingDefinition),
    },
  };
}

export function packagingDefinitionFor(
  configuration: CompanyConfiguration | undefined,
  label: string,
): PackagingDefinition | undefined {
  if (!configuration) {
    return undefined;
  }

  const normalizedLabel = label.trim().toLowerCase();
  return configuration.packagingDefinitions.find(
    (definition) => definition.label.trim().toLowerCase() === normalizedLabel,
  );
}

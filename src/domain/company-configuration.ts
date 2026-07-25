import { companyConfigurationInputSchema } from "@/domain/schemas";
import type {
  BeneficiaryBankProfile,
  CompanyConfiguration,
  DocumentBrandingSettings,
  DocumentBrandingSlotSettings,
  PackagingOption,
} from "@/types/models";

const DEFAULT_PACKAGING_UNITS: PackagingOption[] = [
  { label: "Bag of 60Kg", bagWeightKg: 0.75, netWeightKg: 60 },
  { label: "Bag of 50Kg", bagWeightKg: 0.625, netWeightKg: 50 },
  { label: "Bag of 30Kg", bagWeightKg: 0.375, netWeightKg: 30 },
  { label: "Kg", bagWeightKg: 0, netWeightKg: 1 },
  { label: "Lbs", bagWeightKg: 0, netWeightKg: 0 },
  { label: "Metric Ton", bagWeightKg: 0, netWeightKg: 1000 },
  { label: "Bulk", bagWeightKg: 0, netWeightKg: 0 },
];

function cleanOptional(value?: string): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

const DEFAULT_PAYMENT_TERMS = ["CAD", "LC", "Advance & CAD", "Advance"];
const DEFAULT_DELIVERY_TERMS = ["F.O.B"];
const DEFAULT_PRICE_UOMS = ["Lbs", "Bag of 60Kg", "Bag of 50Kg", "Bag of 30Kg", "Kg", "Metric Ton"];
const DEFAULT_CURRENCIES = ["USD"];
const DEFAULT_MOVEMENT_TYPES = ["FCL/FCL", "CY/CY", "Port to Port", "Door to Port", "Port to Door"];
const DEFAULT_CONTAINER_TYPES = ["20FT (FCL)", "40FT (FCL)"];
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

function normalizePackagingOption(entry: PackagingOption | string): PackagingOption | null {
  if (typeof entry === "string") {
    const label = entry.trim();
    if (!label) {
      return null;
    }
    const fallback = DEFAULT_PACKAGING_UNITS.find(
      (option) => option.label.toLowerCase() === label.toLowerCase(),
    );
    return {
      label,
      bagWeightKg: fallback?.bagWeightKg ?? 0,
      netWeightKg: fallback?.netWeightKg ?? 0,
    };
  }

  const label = entry.label?.trim() ?? "";
  if (!label) {
    return null;
  }

  const fallback = DEFAULT_PACKAGING_UNITS.find(
    (option) => option.label.toLowerCase() === label.toLowerCase(),
  );
  const bagWeightKg = Number.isFinite(entry.bagWeightKg) ? entry.bagWeightKg : (fallback?.bagWeightKg ?? 0);
  const netWeightKg = Number.isFinite(entry.netWeightKg) && (entry.netWeightKg ?? 0) > 0
    ? Number(entry.netWeightKg)
    : (fallback?.netWeightKg ?? 0);

  return {
    label,
    bagWeightKg: Math.max(0, bagWeightKg),
    netWeightKg: Math.max(0, netWeightKg),
  };
}

function resolvePackagingUnits(
  configuration?: Partial<CompanyConfiguration> | null,
  legacyDefinitions?: Array<{
    label: string;
    netWeightKg: number;
    tareWeightKg: number;
    grossWeightKg: number;
  }> | null,
): PackagingOption[] {
  const rawUnits = (configuration as { packagingUnits?: Array<PackagingOption | string> } | null | undefined)
    ?.packagingUnits;
  const fromList = (rawUnits ?? [])
    .map((entry) => normalizePackagingOption(entry))
    .filter((entry): entry is PackagingOption => Boolean(entry));

  const definitionByLabel = new Map(
    (legacyDefinitions ?? []).map((definition) => [
      definition.label.trim().toLowerCase(),
      definition,
    ]),
  );

  const merged = (fromList.length > 0 ? fromList : DEFAULT_PACKAGING_UNITS).map((option) => {
    const legacy = definitionByLabel.get(option.label.toLowerCase());
    if (!legacy) {
      return option;
    }
    return {
      label: option.label,
      bagWeightKg: option.bagWeightKg > 0 ? option.bagWeightKg : legacy.tareWeightKg,
      netWeightKg: option.netWeightKg > 0 ? option.netWeightKg : legacy.netWeightKg,
    };
  });

  const unique = new Map<string, PackagingOption>();
  for (const option of merged) {
    unique.set(option.label.toLowerCase(), option);
  }

  return Array.from(unique.values());
}

function resolvePackagingLabels(configuration?: Partial<CompanyConfiguration> | null): string[] {
  return resolvePackagingUnits(configuration).map((option) => option.label);
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

function resolveStaffingShowDoNumber(configuration?: Partial<CompanyConfiguration> | null): boolean {
  return configuration?.staffingShowDoNumber ?? false;
}

function resolveMovementTypes(configuration?: Partial<CompanyConfiguration> | null): string[] {
  const fromList = normalizePaymentTerms(configuration?.movementTypes);
  if (fromList.length > 0) {
    return fromList;
  }

  return DEFAULT_MOVEMENT_TYPES;
}

function resolveContainerTypes(configuration?: Partial<CompanyConfiguration> | null): string[] {
  const fromList = normalizePaymentTerms(configuration?.containerTypes);
  if (fromList.length > 0) {
    return fromList;
  }

  return DEFAULT_CONTAINER_TYPES;
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
    containerTypes: DEFAULT_CONTAINER_TYPES,
    shippingLines: DEFAULT_SHIPPING_LINES,
    processingEnabled: true,
    staffingShowDoNumber: false,
    documentBranding: DEFAULT_DOCUMENT_BRANDING,
    bulkReferenceKg: 19200,
    beneficiaryBanks: [],
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  };
}

type LegacyPackagingDefinition = {
  label: string;
  uom?: string;
  netWeightKg: number;
  tareWeightKg: number;
  grossWeightKg: number;
};

type LegacyCompanyConfiguration = Partial<CompanyConfiguration> & LegacyPaymentTermFields & LegacyDeliveryTermFields & {
  packagingUnits?: Array<PackagingOption | string>;
  packagingDefinitions?: LegacyPackagingDefinition[];
};

export function resolveCompanyConfiguration(
  orgId: string,
  configuration?: LegacyCompanyConfiguration | null,
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
    packagingUnits: resolvePackagingUnits(configuration, configuration?.packagingDefinitions),
    movementTypes: resolveMovementTypes(configuration),
    containerTypes: resolveContainerTypes(configuration),
    shippingLines: resolveShippingLines(configuration),
    processingEnabled: resolveProcessingEnabled(configuration),
    staffingShowDoNumber: resolveStaffingShowDoNumber(configuration),
    documentBranding: resolveDocumentBranding(configuration),
    bulkReferenceKg: configuration?.bulkReferenceKg ?? defaults.bulkReferenceKg,
    beneficiaryBanks: normalizeBeneficiaryBanks(configuration?.beneficiaryBanks),
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
  const normalized = resolveCompanyConfiguration(
    parsed.orgId,
    parsed.companyConfiguration as LegacyCompanyConfiguration,
  );

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
      packagingUnits: resolvePackagingUnits(normalized),
      movementTypes: normalizePaymentTerms(normalized.movementTypes),
      containerTypes: normalizePaymentTerms(normalized.containerTypes),
      shippingLines: normalizePaymentTerms(normalized.shippingLines),
      processingEnabled: normalized.processingEnabled,
      staffingShowDoNumber: normalized.staffingShowDoNumber,
      documentBranding: resolveDocumentBranding(normalized),
      bulkReferenceKg: normalized.bulkReferenceKg,
      beneficiaryBanks: normalizeBeneficiaryBanks(normalized.beneficiaryBanks),
    },
  };
}

export function packagingOptionFor(
  configuration: CompanyConfiguration | undefined,
  label: string,
): PackagingOption | undefined {
  if (!configuration || !label.trim()) {
    return undefined;
  }

  const normalizedLabel = label.trim().toLowerCase();
  return configuration.packagingUnits.find(
    (option) => option.label.trim().toLowerCase() === normalizedLabel,
  );
}

/** @deprecated Use packagingOptionFor */
export function packagingDefinitionFor(
  configuration: CompanyConfiguration | undefined,
  label: string,
): PackagingOption | undefined {
  return packagingOptionFor(configuration, label);
}

export function packagingLabels(configuration?: CompanyConfiguration | null): string[] {
  return resolvePackagingLabels(configuration);
}

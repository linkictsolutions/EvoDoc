import { companyConfigurationInputSchema } from "@/domain/schemas";
import type { CompanyConfiguration, PackagingDefinition } from "@/types/models";

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
    paymentTermCad: "CAD",
    paymentTermLc: "LC",
    paymentTermAdvanceCad: "Advance & CAD",
    paymentTermAdvance: "Advance",
    bulkReferenceKg: 19200,
    packagingDefinitions: DEFAULT_PACKAGING_DEFINITIONS,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  };
}

export function resolveCompanyConfiguration(
  orgId: string,
  configuration?: Partial<CompanyConfiguration> | null,
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
    paymentTermCad: configuration?.paymentTermCad?.trim() || defaults.paymentTermCad,
    paymentTermLc: configuration?.paymentTermLc?.trim() || defaults.paymentTermLc,
    paymentTermAdvanceCad:
      configuration?.paymentTermAdvanceCad?.trim() || defaults.paymentTermAdvanceCad,
    paymentTermAdvance: configuration?.paymentTermAdvance?.trim() || defaults.paymentTermAdvance,
    bulkReferenceKg: configuration?.bulkReferenceKg ?? defaults.bulkReferenceKg,
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
      paymentTermCad: normalized.paymentTermCad,
      paymentTermLc: normalized.paymentTermLc,
      paymentTermAdvanceCad: normalized.paymentTermAdvanceCad,
      paymentTermAdvance: normalized.paymentTermAdvance,
      bulkReferenceKg: normalized.bulkReferenceKg,
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

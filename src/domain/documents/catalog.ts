import type { DocumentFamily, DocumentType, DocumentVariant, Shipment } from "@/types/models";

export interface DocumentFamilyDefinition {
  family: DocumentFamily;
  label: string;
  docType: DocumentType;
  variants: DocumentVariant[];
}

export const documentFamilies: DocumentFamilyDefinition[] = [
  {
    family: "commercial_invoice",
    label: "Commercial Invoice (ICC)",
    docType: "invoice",
    variants: ["standard"],
  },
  {
    family: "packing_list",
    label: "Packing List (ICC)",
    docType: "packing_list",
    variants: ["standard"],
  },
  {
    family: "shipping_instruction",
    label: "Shipping Instruction",
    docType: "shipping_instructions",
    variants: ["standard"],
  },
  {
    family: "certificate_of_quality",
    label: "Certificate of Quality",
    docType: "quality_certificate",
    variants: ["standard"],
  },
  {
    family: "certificate_of_weight",
    label: "Certificate of Weight",
    docType: "weight_certificate",
    variants: ["standard"],
  },
  {
    family: "way_bill",
    label: "Way Bill",
    docType: "way_bill",
    variants: ["standard"],
  },
];

export function getDocumentFamilyDefinition(family: DocumentFamily): DocumentFamilyDefinition {
  const match = documentFamilies.find((entry) => entry.family === family);
  if (!match) {
    throw new Error(`Unknown document family: ${family}`);
  }

  return match;
}

export function resolveDocumentFamily(docType: DocumentType): DocumentFamily {
  if (docType === "invoice") {
    return "commercial_invoice";
  }

  if (docType === "packing_list") {
    return "packing_list";
  }

  if (docType === "quality_certificate") {
    return "certificate_of_quality";
  }

  if (docType === "weight_certificate") {
    return "certificate_of_weight";
  }

  if (docType === "way_bill") {
    return "way_bill";
  }

  return "shipping_instruction";
}

export function defaultVariantForFamily(): DocumentVariant {
  return "standard";
}

export function resolveVariantForFamily(
  _family: DocumentFamily,
  variant?: DocumentVariant,
): DocumentVariant {
  if (!variant || variant === "standard") {
    return "standard";
  }

  return "standard";
}

export function displayVariant(variant: DocumentVariant): string {
  if (variant === "permit") {
    return "Permit";
  }

  if (variant === "final") {
    return "Final";
  }

  return "Standard";
}

export function makePreviewShipment(contractId: string, orgId: string): Shipment {
  const now = new Date().toISOString();

  return {
    id: "preview",
    orgId,
    contractId,
    status: "draft",
    bookingLines: [],
    totals: {
      totalBags: 0,
      totalGrossWeightKg: 0,
      totalTareWeightKg: 0,
      totalNetWeightKg: 0,
    },
    createdAt: now,
    updatedAt: now,
  };
}

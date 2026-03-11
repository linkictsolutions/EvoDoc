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
    label: "Commercial Invoice",
    docType: "invoice",
    variants: ["permit", "final"],
  },
  {
    family: "packing_list",
    label: "Packing List",
    docType: "packing_list",
    variants: ["permit", "final"],
  },
  {
    family: "shipping_instruction",
    label: "Shipping Instruction",
    docType: "shipping_instructions",
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

  return "shipping_instruction";
}

export function defaultVariantForFamily(family: DocumentFamily): DocumentVariant {
  if (family === "shipping_instruction") {
    return "standard";
  }

  return "final";
}

export function resolveVariantForFamily(
  family: DocumentFamily,
  variant?: DocumentVariant,
): DocumentVariant {
  if (!variant || variant === "standard") {
    return defaultVariantForFamily(family);
  }

  return variant;
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

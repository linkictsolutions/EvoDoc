import { customerMasterInputSchema, itemMasterInputSchema } from "@/domain/schemas";
import type { Customer, Item } from "@/types/models";

function cleanOptional(value?: string): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

export interface NormalizedCustomerMasterPayload {
  customer: Omit<Customer, "id" | "createdAt" | "updatedAt">;
}

export interface NormalizedItemMasterPayload {
  item: Omit<Item, "id" | "createdAt" | "updatedAt">;
}

export function validateAndNormalizeCustomerMasterPayload(
  input: unknown,
): NormalizedCustomerMasterPayload {
  const parsed = customerMasterInputSchema.parse(input);

  return {
    customer: {
      orgId: parsed.orgId,
      name: parsed.customer.name.trim(),
      shortName: cleanOptional(parsed.customer.shortName),
      address: parsed.customer.address.trim(),
      country: parsed.customer.country.trim(),
      contactName: cleanOptional(parsed.customer.contactName),
      contactEmail: cleanOptional(parsed.customer.contactEmail),
      taxId: cleanOptional(parsed.customer.taxId),
    },
  };
}

export function validateAndNormalizeItemMasterPayload(
  input: unknown,
): NormalizedItemMasterPayload {
  const parsed = itemMasterInputSchema.parse(input);

  return {
    item: {
      orgId: parsed.orgId,
      itemCode: parsed.item.itemCode.trim(),
      name: parsed.item.name.trim(),
      description: cleanOptional(parsed.item.description),
      hsCode: cleanOptional(parsed.item.hsCode),
      origin: cleanOptional(parsed.item.origin),
      grade: cleanOptional(parsed.item.grade),
      defaultPackagingUnit: cleanOptional(parsed.item.defaultPackagingUnit),
      defaultBagWeightKg: parsed.item.defaultBagWeightKg,
      active: parsed.item.active,
    },
  };
}

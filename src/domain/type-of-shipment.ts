import type { BookingsSheet } from "@/types/models";

function clean(value?: string): string {
  return value?.trim() ?? "";
}

export function resolveDefaultContainerType(containerTypes?: string[]): string {
  const configured = (containerTypes ?? []).map((entry) => entry.trim()).filter(Boolean);
  return configured[0] ?? "20FT (FCL)";
}

export function buildTypeOfShipmentSummary(args: {
  bookings?: BookingsSheet | null;
  fallbackContainerCount?: number;
  containerTypes?: string[];
}): string {
  const defaultType = resolveDefaultContainerType(args.containerTypes);
  const typeCounts = new Map<string, number>();

  for (const entry of args.bookings?.entries ?? []) {
    const containerNumber = clean(entry.containerNumber);
    if (!containerNumber) {
      continue;
    }

    const containerType = clean(entry.containerType) || defaultType;
    typeCounts.set(containerType, (typeCounts.get(containerType) ?? 0) + 1);
  }

  if (typeCounts.size > 0) {
    return Array.from(typeCounts.entries())
      .map(([type, count]) => `${count} X ${type}`)
      .join(", ");
  }

  const count = Number.isFinite(args.fallbackContainerCount) ? Math.max(0, args.fallbackContainerCount ?? 0) : 0;
  return `${count} X ${defaultType}`;
}

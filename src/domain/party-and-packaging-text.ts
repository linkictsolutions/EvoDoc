import { packagingOptionFor } from "@/domain/company-configuration";
import type { CompanyConfiguration, ContractTerms } from "@/types/models";

export function formatPartyWithAddress(name?: string | null, address?: string | null): string {
  const partyName = name?.trim() ?? "";
  const partyAddress = address?.trim() ?? "";

  if (!partyName) {
    return partyAddress;
  }
  if (!partyAddress) {
    return partyName;
  }

  return `${partyName}, Address: ${partyAddress}`;
}

export function resolvePackagingNetWeightKg(
  terms: Pick<ContractTerms, "packagingUnit" | "bagWeightKg">,
  companyConfiguration?: CompanyConfiguration | null,
): number {
  const selected = packagingOptionFor(companyConfiguration ?? undefined, terms.packagingUnit);
  if (selected && selected.netWeightKg > 0) {
    return selected.netWeightKg;
  }

  return terms.bagWeightKg > 0 ? terms.bagWeightKg : 60;
}

export function buildPackagingAndMarkingLabel(args: {
  bagCount: number;
  netWeightKgPerBag: number;
}): string {
  const bags = Math.max(0, Math.round(args.bagCount));
  const net = Math.max(0, Math.round(args.netWeightKgPerBag));
  return `${bags} BAGS PACKED IN NEW JUTE BAGS OF ${net} KGS NET WEIGHT EACH`;
}

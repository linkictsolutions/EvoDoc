import type { Contract, ContractDocumentSummary, Customer, DocumentStatus } from "@/types/models";
import { formatGroupedFixed, WEIGHT_DP } from "@/domain/rounding";

export function formatListTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatContractProduct(contract: Contract) {
  const origin = contract.terms?.origin?.trim();
  const grade = contract.terms?.grade?.trim();

  if (origin && grade) {
    return `${origin} · ${grade}`;
  }

  return origin || grade || "—";
}

export function formatContractQuantity(contract: Contract) {
  const bags = contract.derived?.noOfBags ?? contract.terms?.quantityBags;
  const mt = contract.derived?.quantityMt;
  const parts: string[] = [];

  if (bags) {
    parts.push(`${bags.toLocaleString()} bags`);
  }

  if (mt) {
    parts.push(`${formatGroupedFixed(mt, WEIGHT_DP)} MT`);
  }

  return parts.length > 0 ? parts.join(" · ") : "—";
}

export function formatContractShipment(contract: Contract) {
  const period = contract.terms?.shipmentPeriod?.trim();
  const destination = contract.shipping?.destinationPort?.trim();

  if (period && destination) {
    return `${period} → ${destination}`;
  }

  return period || destination || "—";
}

export function contractStatusClass(status: string) {
  return `status-pill status-${status.toLowerCase().replace(/\s+/g, "-")}`;
}

export function formatDocumentSummaryLabel(summary: {
  revisionCount: number;
  pendingReviewCount: number;
  latestStatus: DocumentStatus | null;
}) {
  if (summary.revisionCount === 0) {
    return "No revisions";
  }

  const parts = [`${summary.revisionCount} revision${summary.revisionCount === 1 ? "" : "s"}`];

  if (summary.pendingReviewCount > 0) {
    parts.push(`${summary.pendingReviewCount} in review`);
  } else if (summary.latestStatus) {
    parts.push(summary.latestStatus.replace(/_/g, " "));
  }

  return parts.join(" · ");
}

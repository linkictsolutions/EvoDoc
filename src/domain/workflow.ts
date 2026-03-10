import type { DocumentStatus } from "@/types/models";

const transitions: Record<DocumentStatus, DocumentStatus[]> = {
  draft: ["under_review", "voided"],
  under_review: ["draft", "approved", "voided"],
  approved: ["superseded", "voided"],
  superseded: [],
  voided: [],
};

export function canTransitionDocumentStatus(current: DocumentStatus, target: DocumentStatus): boolean {
  return transitions[current].includes(target);
}

export function assertTransition(current: DocumentStatus, target: DocumentStatus): void {
  if (!canTransitionDocumentStatus(current, target)) {
    throw new Error(`Invalid document status transition from ${current} to ${target}`);
  }
}

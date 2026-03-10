import { describe, expect, it } from "vitest";
import { canTransitionDocumentStatus } from "@/domain/workflow";

describe("document workflow", () => {
  it("allows draft to under_review", () => {
    expect(canTransitionDocumentStatus("draft", "under_review")).toBe(true);
  });

  it("disallows draft to approved directly", () => {
    expect(canTransitionDocumentStatus("draft", "approved")).toBe(false);
  });

  it("allows under_review to approved", () => {
    expect(canTransitionDocumentStatus("under_review", "approved")).toBe(true);
  });
});

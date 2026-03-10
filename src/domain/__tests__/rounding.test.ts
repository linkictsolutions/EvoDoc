import { describe, expect, it } from "vitest";
import { formatMoney, formatWeight, kgToLb, roundMoney, roundWeight } from "@/domain/rounding";

describe("rounding", () => {
  it("rounds weights to 3 decimal places", () => {
    expect(roundWeight(12.34567)).toBe(12.346);
  });

  it("rounds money to 2 decimal places", () => {
    expect(roundMoney(10.255)).toBe(10.26);
  });

  it("converts kg to pounds deterministically", () => {
    expect(kgToLb(1)).toBe(2.205);
  });

  it("formats values", () => {
    expect(formatWeight(50)).toBe("50.000 kg");
    expect(formatMoney(25.4, "USD")).toMatch("$25.40");
  });
});

import { describe, expect, it } from "vitest";
import { amountToWords, numberToWords } from "@/domain/amount-words";

describe("amount words", () => {
  it("converts integer numbers", () => {
    expect(numberToWords(0)).toBe("Zero");
    expect(numberToWords(19)).toBe("Nineteen");
    expect(numberToWords(125)).toBe("One Hundred Twenty Five");
    expect(numberToWords(2037)).toBe("Two Thousand Thirty Seven");
  });

  it("builds amount in words sentence", () => {
    const words = amountToWords(2037.07, "USD");
    expect(words).toContain("USD 2,037.07");
    expect(words).toContain("Two Thousand Thirty Seven");
    expect(words).toContain("Seven Cents Only");
  });
});

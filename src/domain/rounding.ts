import Decimal from "decimal.js";

export const WEIGHT_DP = 3;
export const MONEY_DP = 2;

export function roundWeight(value: Decimal.Value): number {
  return new Decimal(value).toDecimalPlaces(WEIGHT_DP, Decimal.ROUND_HALF_UP).toNumber();
}

export function roundMoney(value: Decimal.Value): number {
  return new Decimal(value).toDecimalPlaces(MONEY_DP, Decimal.ROUND_HALF_UP).toNumber();
}

export function kgToLb(value: Decimal.Value): number {
  return roundWeight(new Decimal(value).mul(2.2046226218));
}

export function sum(values: Decimal.Value[]): Decimal {
  return values.reduce<Decimal>((acc, current) => acc.plus(current), new Decimal(0));
}

export function formatMoney(value: Decimal.Value, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: MONEY_DP,
    maximumFractionDigits: MONEY_DP,
  }).format(roundMoney(value));
}

export function formatWeight(value: Decimal.Value): string {
  return `${roundWeight(value).toFixed(WEIGHT_DP)} kg`;
}

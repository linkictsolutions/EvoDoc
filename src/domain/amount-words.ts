const SMALL: string[] = [
  "Zero",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];

const TENS: string[] = [
  "",
  "",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety",
];

const SCALE: string[] = ["", "Thousand", "Million", "Billion", "Trillion"];

function chunkToWords(n: number): string {
  if (n === 0) {
    return "";
  }

  const parts: string[] = [];
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;

  if (hundreds > 0) {
    parts.push(`${SMALL[hundreds]} Hundred`);
  }

  if (rest > 0) {
    if (rest < 20) {
      parts.push(SMALL[rest]);
    } else {
      const tens = Math.floor(rest / 10);
      const ones = rest % 10;
      if (ones > 0) {
        parts.push(`${TENS[tens]} ${SMALL[ones]}`);
      } else {
        parts.push(TENS[tens]);
      }
    }
  }

  return parts.join(" ").trim();
}

export function numberToWords(value: number): string {
  const integer = Math.floor(Math.abs(value));

  if (integer === 0) {
    return "Zero";
  }

  const groups: string[] = [];
  let n = integer;
  let scaleIndex = 0;

  while (n > 0) {
    const chunk = n % 1000;
    if (chunk > 0) {
      const chunkWords = chunkToWords(chunk);
      const suffix = SCALE[scaleIndex] ? ` ${SCALE[scaleIndex]}` : "";
      groups.unshift(`${chunkWords}${suffix}`.trim());
    }
    n = Math.floor(n / 1000);
    scaleIndex += 1;
  }

  return groups.join(" ").trim();
}

export function amountToWords(value: number, currency = "USD"): string {
  const abs = Math.abs(value);
  const whole = Math.floor(abs);
  const cents = Math.round((abs - whole) * 100);
  const wholeWords = numberToWords(whole);
  const centsWords = numberToWords(cents);

  return `${currency} ${abs.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} (${wholeWords} and ${centsWords} Cents Only)`;
}

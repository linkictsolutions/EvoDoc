"use client";

import { COUNTRY_OPTIONS, formatCountryOption, resolveCountryName } from "@/domain/countries";

type CountrySelectProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  required?: boolean;
  id?: string;
  placeholder?: string;
};

export function CountrySelect({
  value,
  onChange,
  className,
  required,
  id,
  placeholder = "Select country",
}: CountrySelectProps) {
  const normalizedValue = resolveCountryName(value);
  const hasCustomValue = Boolean(value.trim()) && !COUNTRY_OPTIONS.some((option) => option.name === normalizedValue);

  return (
    <select
      id={id}
      className={className}
      value={normalizedValue}
      required={required}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="">{placeholder}</option>
      {COUNTRY_OPTIONS.map((option) => (
        <option key={option.code} value={option.name}>
          {formatCountryOption(option)}
        </option>
      ))}
      {hasCustomValue ? (
        <option value={value.trim()}>{value.trim()}</option>
      ) : null}
    </select>
  );
}

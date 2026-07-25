"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { COUNTRY_OPTIONS, resolveCountryName } from "@/domain/countries";

type CountrySelectProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  required?: boolean;
  id?: string;
  placeholder?: string;
};

function flagUrl(code: string): string {
  return `https://flagcdn.com/24x18/${code.toLowerCase()}.png`;
}

export function CountrySelect({
  value,
  onChange,
  className,
  required,
  id,
  placeholder = "Select country",
}: CountrySelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement | null>(null);
  const normalizedValue = resolveCountryName(value);
  const selected = useMemo(
    () => COUNTRY_OPTIONS.find((option) => option.name === normalizedValue),
    [normalizedValue],
  );
  const hasCustomValue = Boolean(value.trim()) && !selected;

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return COUNTRY_OPTIONS;
    }
    return COUNTRY_OPTIONS.filter((option) => (
      option.name.toLowerCase().includes(needle)
      || option.code.toLowerCase().includes(needle)
    ));
  }, [query]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  return (
    <div ref={rootRef} className={`country-select ${className ?? ""}`.trim()} id={id}>
      <button
        type="button"
        className={`country-select-trigger ${required && !normalizedValue ? "is-required" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {selected ? (
          <span className="country-select-value">
            <img src={flagUrl(selected.code)} alt="" width={24} height={18} />
            <span>{selected.name}</span>
          </span>
        ) : hasCustomValue ? (
          <span>{value.trim()}</span>
        ) : (
          <span className="country-select-placeholder">{placeholder}</span>
        )}
      </button>
      {open ? (
        <div className="country-select-menu" role="listbox">
          <input
            className="country-select-search"
            value={query}
            placeholder="Search country"
            onChange={(event) => setQuery(event.target.value)}
            autoFocus
          />
          <div className="country-select-options">
            <button
              type="button"
              className="country-select-option"
              onClick={() => {
                onChange("");
                setOpen(false);
                setQuery("");
              }}
            >
              {placeholder}
            </button>
            {filtered.map((option) => (
              <button
                type="button"
                key={option.code}
                className={`country-select-option ${option.name === normalizedValue ? "is-active" : ""}`}
                role="option"
                aria-selected={option.name === normalizedValue}
                onClick={() => {
                  onChange(option.name);
                  setOpen(false);
                  setQuery("");
                }}
              >
                <img src={flagUrl(option.code)} alt="" width={24} height={18} />
                <span>{option.name}</span>
              </button>
            ))}
            {hasCustomValue ? (
              <button
                type="button"
                className="country-select-option is-active"
                onClick={() => {
                  onChange(value.trim());
                  setOpen(false);
                }}
              >
                {value.trim()}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
      {required ? (
        <input
          tabIndex={-1}
          aria-hidden="true"
          value={normalizedValue}
          required
          onChange={() => undefined}
          style={{ position: "absolute", opacity: 0, pointerEvents: "none", height: 0, width: 0 }}
        />
      ) : null}
    </div>
  );
}

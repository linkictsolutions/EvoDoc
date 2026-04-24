"use client";

type CenteredLoaderProps = {
  label?: string;
  scope?: "card" | "page" | "inline";
};

export function CenteredLoader({
  label = "Loading...",
  scope = "card",
}: CenteredLoaderProps) {
  return (
    <div className={`centered-loader centered-loader-${scope}`} role="status" aria-live="polite" aria-busy="true">
      <span className="centered-loader-spinner" aria-hidden="true" />
      <p>{label}</p>
    </div>
  );
}

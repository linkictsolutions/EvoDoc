"use client";

import clsx from "clsx";

type CenteredLoaderProps = {
  label?: string;
  scope?: "card" | "page" | "inline";
};

export function CenteredLoader({
  label = "Loading...",
  scope = "card",
}: CenteredLoaderProps) {
  return (
    <div
      className={clsx("centered-loader", `centered-loader-${scope}`)}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="centered-loader-visual" aria-hidden="true">
        <span className="centered-loader-ring" />
        <span className="centered-loader-ring centered-loader-ring-delayed" />
        <span className="centered-loader-core" />
      </div>
      <div className="centered-loader-copy">
        <p className="centered-loader-label">{label}</p>
        <span className="centered-loader-track">
          <span className="centered-loader-track-bar" />
        </span>
      </div>
    </div>
  );
}

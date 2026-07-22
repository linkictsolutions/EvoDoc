import type { ReactNode } from "react";

export function DocumentMetadataGrid({
  children,
}: {
  children: ReactNode;
}) {
  return <div className="document-meta-grid">{children}</div>;
}

export function DocumentMetadataItem({
  label,
  children,
  wide = false,
}: {
  label: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "document-meta-item document-meta-item--wide" : "document-meta-item"}>
      <span className="document-meta-item__label">{label}</span>
      <span className="document-meta-item__value">{children}</span>
    </div>
  );
}

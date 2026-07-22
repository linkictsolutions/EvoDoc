import type { ReactNode } from "react";

export function FormActionBar({
  children,
  hint,
}: {
  children: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <div className="form-action-bar" role="region" aria-label="Form actions">
      <div className="form-action-bar__inner">
        {hint ? <div className="form-action-bar__hint">{hint}</div> : <div />}
        <div className="form-action-bar__actions row-actions">{children}</div>
      </div>
    </div>
  );
}

import type { ReactNode } from "react";

export function FormSection({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={className ? `form-section ${className}` : "form-section"}>
      <div className="form-section__header">
        <div className="form-section__intro">
          <h2 className="form-section__title">{title}</h2>
          {description ? <p className="form-section__description">{description}</p> : null}
        </div>
        {actions ? <div className="form-section__actions">{actions}</div> : null}
      </div>
      <div className="form-section__body form-grid">{children}</div>
    </section>
  );
}

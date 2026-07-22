"use client";

import { useEffect, type ReactNode } from "react";

type ModalPanelProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  wide?: boolean;
};

export function ModalPanel({
  open,
  onClose,
  title,
  description,
  children,
  className,
  wide = false,
}: ModalPanelProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const panelClassName = [
    "modal-panel",
    wide ? "modal-panel--wide" : "",
    className,
  ].filter(Boolean).join(" ");

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className={panelClassName}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-panel-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-panel__header">
          <div className="modal-panel__intro">
            <h3 id="modal-panel-title">{title}</h3>
            {description ? <p className="modal-panel__description">{description}</p> : null}
          </div>
          <button
            type="button"
            className="modal-panel__close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </header>
        <div className="modal-panel__body">{children}</div>
      </section>
    </div>
  );
}

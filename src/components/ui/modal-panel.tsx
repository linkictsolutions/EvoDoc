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
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
};

export function ModalPanel({
  open,
  onClose,
  title,
  description,
  children,
  className,
  wide = false,
  closeOnBackdropClick = true,
  closeOnEscape = true,
}: ModalPanelProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (closeOnEscape && event.key === "Escape") {
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
  }, [closeOnEscape, open, onClose]);

  if (!open) {
    return null;
  }

  const panelClassName = [
    "modal-panel",
    wide ? "modal-panel--wide" : "",
    className,
  ].filter(Boolean).join(" ");

  return (
    <div
      className="modal-backdrop"
      onClick={closeOnBackdropClick ? onClose : undefined}
    >
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

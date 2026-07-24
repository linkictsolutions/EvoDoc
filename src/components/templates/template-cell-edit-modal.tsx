"use client";

import { useEffect, useState } from "react";
import { ModalPanel } from "@/components/ui/modal-panel";
import type { TemplateGridCell } from "@/domain/template-layout";

type TemplateCellEditModalProps = {
  open: boolean;
  cell: TemplateGridCell | null;
  onDiscard: () => void;
  onSave: (next: TemplateGridCell) => void;
};

export function TemplateCellEditModal({
  open,
  cell,
  onDiscard,
  onSave,
}: TemplateCellEditModalProps) {
  const [label, setLabel] = useState("");
  const [showBorder, setShowBorder] = useState(true);

  useEffect(() => {
    if (!open || !cell) {
      return;
    }

    setLabel(cell.label);
    setShowBorder(cell.showBorder !== false);
  }, [cell, open]);

  if (!cell) {
    return null;
  }

  return (
    <ModalPanel
      open={open}
      onClose={onDiscard}
      title="Edit Field"
      description={`Configure how "${cell.id}" appears in the generated PDF.`}
      closeOnBackdropClick={false}
      closeOnEscape={false}
    >
      <div className="template-cell-edit-form">
        <label className="col-12">
          <span className="label-text">Label</span>
          <input value={label} onChange={(event) => setLabel(event.target.value)} autoFocus />
        </label>
        <label className="col-12 template-checkbox-row">
          <input
            type="checkbox"
            checked={showBorder}
            onChange={(event) => setShowBorder(event.target.checked)}
          />
          <span>Has border line</span>
        </label>
        <div className="row-actions template-cell-edit-actions">
          <button type="button" className="button-secondary" onClick={onDiscard}>
            Discard
          </button>
          <button
            type="button"
            onClick={() => onSave({
              ...cell,
              label: label.trim() || cell.label,
              showBorder,
            })}
            disabled={label.trim().length === 0}
          >
            Save
          </button>
        </div>
      </div>
    </ModalPanel>
  );
}

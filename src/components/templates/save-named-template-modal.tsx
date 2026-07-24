"use client";

import { useEffect, useState } from "react";
import { ModalPanel } from "@/components/ui/modal-panel";

type SaveNamedTemplateModalProps = {
  open: boolean;
  busy?: boolean;
  onDiscard: () => void;
  onSave: (name: string) => void;
};

export function SaveNamedTemplateModal({
  open,
  busy = false,
  onDiscard,
  onSave,
}: SaveNamedTemplateModalProps) {
  const [name, setName] = useState("");

  useEffect(() => {
    if (open) {
      setName("");
    }
  }, [open]);

  return (
    <ModalPanel
      open={open}
      onClose={onDiscard}
      title="Save Template"
      description="Enter a name for this template. Saved templates can be loaded later or selected when generating documents."
      closeOnBackdropClick={false}
      closeOnEscape={false}
    >
      <div className="template-cell-edit-form">
        <label className="col-12">
          <span className="label-text">Template Name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. ICC Standard Layout"
            disabled={busy}
            autoFocus
          />
        </label>
        <div className="row-actions template-cell-edit-actions">
          <button type="button" className="button-secondary" onClick={onDiscard} disabled={busy}>
            Discard
          </button>
          <button
            type="button"
            onClick={() => onSave(name.trim())}
            disabled={busy || name.trim().length === 0}
          >
            {busy ? "Saving..." : "Save Template"}
          </button>
        </div>
      </div>
    </ModalPanel>
  );
}

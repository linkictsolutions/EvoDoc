"use client";

import { ModalPanel } from "@/components/ui/modal-panel";
import type { SavedDocumentTemplate } from "@/types/models";

type TemplatePickerModalProps = {
  open: boolean;
  templates: SavedDocumentTemplate[];
  busy?: boolean;
  onCancel: () => void;
  onSelect: (template: SavedDocumentTemplate) => void;
};

function formatTemplateDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function TemplatePickerModal({
  open,
  templates,
  busy = false,
  onCancel,
  onSelect,
}: TemplatePickerModalProps) {
  return (
    <ModalPanel
      open={open}
      onClose={onCancel}
      title="Choose Template"
      description="Multiple saved templates exist for this document. Select which layout to use for generation."
      wide
      closeOnBackdropClick={false}
      closeOnEscape={false}
    >
      <div className="template-picker-list">
        {templates.map((template) => (
          <button
            key={template.id}
            type="button"
            className="template-picker-item"
            disabled={busy}
            onClick={() => onSelect(template)}
          >
            <strong>{template.name}</strong>
            <span className="muted-text">Saved {formatTemplateDate(template.createdAt)}</span>
          </button>
        ))}
      </div>
      <div className="row-actions template-cell-edit-actions">
        <button type="button" className="button-secondary" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
      </div>
    </ModalPanel>
  );
}

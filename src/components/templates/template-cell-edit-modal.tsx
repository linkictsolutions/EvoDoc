"use client";

import { useEffect, useState } from "react";
import { ModalPanel } from "@/components/ui/modal-panel";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import {
  getDefaultStaticHtml,
  isTemplateNoteCell,
  isTemplateRichContentCell,
  isTemplateStaticTextCell,
  resolveTemplateCellStaticHtml,
} from "@/domain/template-static-content";
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
  const [staticHtml, setStaticHtml] = useState("");

  const isRichContentCell = cell ? isTemplateRichContentCell(cell) : false;
  const isStaticCell = cell ? isTemplateStaticTextCell(cell.id) : false;
  const isNoteCell = cell ? isTemplateNoteCell(cell) : false;

  useEffect(() => {
    if (!open || !cell) {
      return;
    }

    setLabel(cell.label);
    setShowBorder(cell.showBorder !== false);
    setStaticHtml(resolveTemplateCellStaticHtml(cell));
  }, [cell, open]);

  if (!cell) {
    return null;
  }

  return (
    <ModalPanel
      open={open}
      onClose={onDiscard}
      title={isNoteCell ? "Edit Note" : isStaticCell ? "Edit Static Text" : "Edit Field"}
      description={
        isRichContentCell
          ? `Edit the content for "${cell.label}". Use tokens like {{DESCRIPTION}} where needed.`
          : `Configure how "${cell.id}" appears in the generated PDF.`
      }
      wide={isRichContentCell}
      closeOnBackdropClick={false}
      closeOnEscape={false}
    >
      <div className="template-cell-edit-form">
        <label className="col-12">
          <span className="label-text">Field label</span>
          <input value={label} onChange={(event) => setLabel(event.target.value)} autoFocus={!isRichContentCell} />
        </label>

        {isRichContentCell ? (
          <div className="col-12">
            <span className="label-text">Content</span>
            <RichTextEditor value={staticHtml} onChange={setStaticHtml} />
            {getDefaultStaticHtml(cell.id) ? (
              <p className="template-cell-edit-hint">
                Default text is pre-filled. Tokens such as {"{{DESCRIPTION}}"} are replaced when the document is generated.
              </p>
            ) : null}
          </div>
        ) : null}

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
              ...(isRichContentCell
                ? {
                    contentKind: isNoteCell ? "note" as const : "static" as const,
                    staticHtml: staticHtml.trim() || (isStaticCell ? getDefaultStaticHtml(cell.id) : "<p></p>") || staticHtml,
                  }
                : {}),
            })}
            disabled={label.trim().length === 0 || (isRichContentCell && staticHtml.trim().length === 0)}
          >
            Save
          </button>
        </div>
      </div>
    </ModalPanel>
  );
}

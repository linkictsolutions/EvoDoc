"use client";

import { useState } from "react";
import { TemplatePickerModal } from "@/components/documents/template-picker-modal";
import { resolveTemplateForGeneration } from "@/lib/documents/resolve-template-for-generation";
import type { DocumentType, DocumentVariant, SavedDocumentTemplate } from "@/types/models";

export function useTemplatePicker() {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTemplates, setPickerTemplates] = useState<SavedDocumentTemplate[]>([]);
  const [pickerBusy, setPickerBusy] = useState(false);
  const [pendingResolve, setPendingResolve] = useState<((layout: string) => void) | null>(null);
  const [pendingReject, setPendingReject] = useState<((error: Error) => void) | null>(null);

  async function chooseTemplateLayout(docType: DocumentType, docVariant?: DocumentVariant) {
    const resolution = await resolveTemplateForGeneration(docType, docVariant);
    if (resolution.mode === "picker") {
      return new Promise<string>((resolve, reject) => {
        setPickerTemplates(resolution.templates);
        setPendingResolve(() => resolve);
        setPendingReject(() => reject);
        setPickerOpen(true);
      });
    }

    return resolution.layout;
  }

  function handlePickerSelect(template: SavedDocumentTemplate) {
    setPickerBusy(true);
    pendingResolve?.(template.layout);
    setPickerOpen(false);
    setPickerBusy(false);
    setPendingResolve(null);
    setPendingReject(null);
  }

  function handlePickerCancel() {
    if (pickerBusy) {
      return;
    }

    pendingReject?.(new Error("Template selection cancelled."));
    setPickerOpen(false);
    setPendingResolve(null);
    setPendingReject(null);
  }

  const pickerModal = (
    <TemplatePickerModal
      open={pickerOpen}
      templates={pickerTemplates}
      busy={pickerBusy}
      onCancel={handlePickerCancel}
      onSelect={handlePickerSelect}
    />
  );

  return {
    chooseTemplateLayout,
    pickerModal,
  };
}

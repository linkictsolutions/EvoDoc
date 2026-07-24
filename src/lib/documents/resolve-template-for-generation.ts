import { apiClient } from "@/lib/api/client";
import { DEFAULT_ORG_ID } from "@/lib/config";
import { readTemplateLayoutForDocType } from "@/lib/documents/template-storage-keys";
import type { DocumentType, SavedDocumentTemplate } from "@/types/models";

export type TemplateResolution =
  | { mode: "layout"; layout: string; templateId?: string; templateName?: string }
  | { mode: "picker"; templates: SavedDocumentTemplate[] };

export async function resolveTemplateForGeneration(
  docType: DocumentType,
  docVariant?: string,
): Promise<TemplateResolution> {
  const templates = await apiClient<SavedDocumentTemplate[]>(
    `/api/templates?orgId=${DEFAULT_ORG_ID}&docType=${encodeURIComponent(docType)}`,
  ).catch(() => [] as SavedDocumentTemplate[]);

  if (templates.length >= 2) {
    return { mode: "picker", templates };
  }

  if (templates.length === 1) {
    return {
      mode: "layout",
      layout: templates[0].layout,
      templateId: templates[0].id,
      templateName: templates[0].name,
    };
  }

  const draftLayout = readTemplateLayoutForDocType(docType, docVariant);
  if (!draftLayout) {
    throw new Error("No template is available. Prepare and save a template in Masters → Templates first.");
  }

  return {
    mode: "layout",
    layout: draftLayout,
    templateName: "Working draft",
  };
}

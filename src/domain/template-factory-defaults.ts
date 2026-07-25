import { getFactoryDefaultSections } from "@/domain/template-defaults";
import { applyStaticDefaultsToCell } from "@/domain/template-static-content";
import { scaleSections12To24, serializeTemplateLayout, relayoutTemplateSections, type TemplateSection } from "@/domain/template-layout";
import type { DocumentType, DocumentVariant } from "@/types/models";

function withStaticDefaults(sections: TemplateSection[]): TemplateSection[] {
  return sections.map((section) => ({
    ...section,
    cells: (section.cells ?? []).map(applyStaticDefaultsToCell),
  }));
}

export function getFactoryDefaultTemplateLayout(
  docType: DocumentType,
  docVariant?: DocumentVariant,
): string | undefined {
  const sections = getFactoryDefaultSections(docType, docVariant);
  if (!sections) {
    return undefined;
  }

  return serializeTemplateLayout({
    version: 1,
    sections: relayoutTemplateSections(withStaticDefaults(scaleSections12To24(sections))),
    availableFields: {},
    spacerCounter: 1,
  });
}

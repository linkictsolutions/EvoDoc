import type { PersistedTemplateLayout } from "@/domain/template-layout";

export function isCurrentWayBillTemplate(stored: PersistedTemplateLayout): boolean {
  const sectionIds = new Set(stored.sections.map((section) => section.id));
  if (!sectionIds.has("conditions") || !sectionIds.has("declaration") || !sectionIds.has("goods")) {
    return false;
  }

  const transport = stored.sections.find((section) => section.id === "transport");
  const transportCharge = stored.sections.find((section) => section.id === "transport_charge");
  const footer = stored.sections.find((section) => section.id === "footer");
  return Boolean(
    transport?.cells.some((cell) => cell.id === "wb_lbl_exporter")
    && transport?.cells.some((cell) => cell.id === "wb_lbl_to")
    && transportCharge?.cells.some((cell) => cell.id === "wb_demurrage")
    && footer?.cells.some((cell) => cell.id === "wb_lbl_footer_driver"),
  );
}

import type { TemplateGridCell } from "@/domain/template-layout";

export const ICC_DECLARATION_TEXT =
  "We hereby certify that this invoice is in all respects correct and true, as regards to both the prices and description of the goods referred to herein, and that the country of origin of the goods is Ethiopia.";

export const ICO_CERTIFICATION_STATEMENT =
  "IT IS HEREBY CERTIFIED THAT THE COFFEE DESCRIBED ABOVE WAS GROWN IN THE COUNTRY NAMED IN BOX 5 AND HAS BEEN EXPORTED ON THE DATE SHOWN BELOW";

export const WAY_BILL_DRIVER_DECLARATION_TEMPLATE =
  "I {{DRIVER_NAME}} the undersigned_____________and that I have Received the Goods from {{SELLER_NAME}} and bind myself to convey them safe to Djibouti port.";

export const WAY_BILL_TERMS_INTRO = "According to the following terms and conditions.";

export const WAY_BILL_CONDITION_1 =
  "1. I undertake to make good any shortage in goods at the market price ruling.";

export const WAY_BILL_CONDITION_2 =
  "2. I agree that this consignment is now under my charge and entire responsibility.";

export const WAY_BILL_CONDITION_3 =
  "3. I declare that my lorry is equipped with tarpaulin and that I have received the described goods in good condition.";

export const WAY_BILL_AMHARIC_DECLARATION =
  "ከላይ የተጠቀሱትን ህግና ደንቦች አንብቤና ተረድቼ ለማንኛውም ችግር ሀላፊነት ለመውሰድ በፊርማየ አረጋግጣለሁ፡ ፡";

export const QUALITY_STATEMENT_TEMPLATE = "THIS IS A QUALITY CERTIFICATE IS FOR {{DESCRIPTION}}";

const STATIC_TEXT_CELL_IDS = new Set([
  "inv_title",
  "inv_page",
  "pl_title",
  "pl_page",
  "si_title",
  "si_page",
  "qc_title",
  "qc_statement",
  "wc_title",
  "wb_title",
  "wb_decl_title",
  "wb_goods_hdr",
  "wb_terms_intro",
  "wb_condition_1",
  "wb_condition_2",
  "wb_condition_3",
  "wb_driver_decl",
  "wb_amharic",
  "wb_footer_signature",
  "wb_footer_date",
  "ico_title",
  "bl_title",
  "bl_page",
  "bl_particulars_hdr",
  "bl_legal",
  "gt_total_label",
  "gt_words",
  "ts_declaration",
  "tt_declaration",
  "fm_signature",
  "ts_signature",
  "wb_transport_label",
  "bd_beneficiary_hdr",
  "bd_corr_hdr",
]);

const DEFAULT_STATIC_HTML: Record<string, string> = {
  inv_title: "<p style=\"text-align: left\"><strong>COMMERCIAL INVOICE</strong></p>",
  inv_page: "<p style=\"text-align: right\"><strong>PAGE 1 OF 1 | ORIGINAL/FINAL</strong></p>",
  pl_title: "<p style=\"text-align: left\"><strong>PACKING LIST</strong></p>",
  pl_page: "<p style=\"text-align: right\"><strong>PAGE 1 OF 1 | ORIGINAL/FINAL</strong></p>",
  si_title: "<p style=\"text-align: left\"><strong>SHIPPING INSTRUCTION</strong></p>",
  si_page: "<p style=\"text-align: right\"><strong>PAGE 1 OF 1</strong></p>",
  qc_title: "<p style=\"text-align: center\"><strong>CERTIFICATE OF QUALITY</strong></p>",
  qc_statement: `<p>${QUALITY_STATEMENT_TEMPLATE}</p>`,
  wc_title: "<p style=\"text-align: center\"><strong>CERTIFICATE OF WEIGHT</strong></p>",
  wb_title: "<p style=\"text-align: center\"><strong>WAY BILL</strong></p>",
  wb_decl_title: "<p><strong>Driver's Declaration</strong></p>",
  wb_goods_hdr: "<p><strong>Detail of Goods</strong></p>",
  wb_terms_intro: `<p><strong>${WAY_BILL_TERMS_INTRO}</strong></p>`,
  wb_condition_1: `<p>${WAY_BILL_CONDITION_1}</p>`,
  wb_condition_2: `<p>${WAY_BILL_CONDITION_2}</p>`,
  wb_condition_3: `<p>${WAY_BILL_CONDITION_3}</p>`,
  wb_driver_decl: `<p>${WAY_BILL_DRIVER_DECLARATION_TEMPLATE}</p>`,
  wb_amharic: `<p>${WAY_BILL_AMHARIC_DECLARATION}</p>`,
  wb_footer_signature: "<p>&nbsp;</p>",
  wb_footer_date: "<p>Stamp &amp; Date:</p>",
  ico_title: "<p style=\"text-align: center\"><strong>ICO CERTIFICATE OF ORIGIN</strong></p>",
  bl_title: "<p><strong>MEDITERRANEAN SHIPPING COMPANY S.A. / SCAC Code: MSCU</strong></p>",
  bl_page: "<p style=\"text-align: right\"><strong>PAGE 1 OF 1 | ORIGINAL</strong></p>",
  bl_particulars_hdr:
    "<p><strong>PARTICULARS FURNISHED BY THE SHIPPER – NOT CHECKED BY CARRIER – CARRIER NOT RESPONSIBLE (see Clause 14)</strong></p>",
  bl_legal:
    "<p>RECEIVED by the Carrier in apparent good order and condition (unless otherwise stated herein) the total number or quantity of Containers or other packages or units indicated in the box entitled Carrier's Receipt for carriage subject to all the terms and conditions hereof from the Place of Receipt or Port of Loading to the Port of Discharge or Place of Delivery, whichever is applicable.</p>",
  gt_total_label: "<p style=\"text-align: right\"><strong>TOTAL AMOUNT IN USD</strong></p>",
  gt_words: "<p><strong>AMOUNT IN WORDS:</strong> {{AMOUNT_IN_WORDS}}</p>",
  ts_declaration: `<p>${ICC_DECLARATION_TEXT}</p>`,
  tt_declaration: `<p>${ICC_DECLARATION_TEXT}</p>`,
  fm_signature: "<p><strong>Authorized Signature &amp; Company Seal/Stamp</strong></p>",
  ts_signature: "<p><strong>Authorized Signature &amp; Seal/Stamp</strong></p>",
  wb_transport_label: "<p>The Truck carry the above mentioned Transport at ETH Birr</p>",
  bd_beneficiary_hdr: "<p><strong>Bank Details (Beneficiary)</strong></p>",
  bd_corr_hdr: "<p><strong>Correspondent Bank</strong></p>",
};

export function isTemplateStaticTextCell(cellId: string): boolean {
  return STATIC_TEXT_CELL_IDS.has(cellId);
}

export function isTemplateNoteCell(cell: Pick<TemplateGridCell, "id" | "contentKind">): boolean {
  return cell.contentKind === "note" || cell.id.startsWith("note_");
}

export function isTemplateRichContentCell(cell: Pick<TemplateGridCell, "id" | "contentKind">): boolean {
  return isTemplateStaticTextCell(cell.id) || isTemplateNoteCell(cell);
}

export function getDefaultStaticHtml(cellId: string): string | undefined {
  return DEFAULT_STATIC_HTML[cellId];
}

export function resolveTemplateCellStaticHtml(cell: Pick<TemplateGridCell, "id" | "staticHtml" | "contentKind">): string {
  const custom = cell.staticHtml?.trim();
  if (custom) {
    return custom;
  }
  if (isTemplateNoteCell(cell)) {
    return "<p></p>";
  }
  return getDefaultStaticHtml(cell.id) ?? "";
}

export function applyStaticTokens(html: string, tokens: Record<string, string>): string {
  return Object.entries(tokens).reduce(
    (result, [key, value]) => result.replaceAll(`{{${key}}}`, value),
    html,
  );
}

export function applyStaticDefaultsToCell(cell: TemplateGridCell): TemplateGridCell {
  if (!isTemplateStaticTextCell(cell.id)) {
    return cell;
  }

  return {
    ...cell,
    contentKind: "static",
    staticHtml: cell.staticHtml?.trim() || getDefaultStaticHtml(cell.id),
  };
}

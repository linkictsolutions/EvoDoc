export interface ExcelFieldMapEntry {
  workbook: "Coffee Doc-Praxis-V2.xlsm";
  sheet: string;
  excelCellOrRange: string;
  mappedField: string;
  docTypes: Array<"invoice" | "packing_list" | "shipping_instructions" | "quality_certificate" | "weight_certificate">;
  notes?: string;
}

export const excelFieldMap: ExcelFieldMapEntry[] = [
  {
    workbook: "Coffee Doc-Praxis-V2.xlsm",
    sheet: "Form Configuration",
    excelCellOrRange: "B1:D1",
    mappedField: "organization.legalName",
    docTypes: ["invoice", "packing_list", "shipping_instructions"],
  },
  {
    workbook: "Coffee Doc-Praxis-V2.xlsm",
    sheet: "Form Configuration",
    excelCellOrRange: "B2:D2",
    mappedField: "organization.address",
    docTypes: ["invoice", "packing_list", "shipping_instructions"],
  },
  {
    workbook: "Coffee Doc-Praxis-V2.xlsm",
    sheet: "Form Configuration",
    excelCellOrRange: "D16",
    mappedField: "commodity.hsCode",
    docTypes: ["invoice", "packing_list", "shipping_instructions"],
  },

  {
    workbook: "Coffee Doc-Praxis-V2.xlsm",
    sheet: "Contract",
    excelCellOrRange: "C5",
    mappedField: "contract.contractNumber",
    docTypes: ["invoice", "packing_list", "shipping_instructions"],
  },
  {
    workbook: "Coffee Doc-Praxis-V2.xlsm",
    sheet: "Contract",
    excelCellOrRange: "C7",
    mappedField: "contract.contractDate",
    docTypes: ["invoice", "packing_list", "shipping_instructions"],
  },
  {
    workbook: "Coffee Doc-Praxis-V2.xlsm",
    sheet: "Contract",
    excelCellOrRange: "C9",
    mappedField: "customer.name",
    docTypes: ["invoice", "packing_list", "shipping_instructions"],
  },
  {
    workbook: "Coffee Doc-Praxis-V2.xlsm",
    sheet: "Contract",
    excelCellOrRange: "C11",
    mappedField: "customer.address",
    docTypes: ["invoice", "packing_list", "shipping_instructions"],
  },
  {
    workbook: "Coffee Doc-Praxis-V2.xlsm",
    sheet: "Contract",
    excelCellOrRange: "D13",
    mappedField: "contract.terms.quality",
    docTypes: ["invoice", "packing_list", "shipping_instructions"],
  },
  {
    workbook: "Coffee Doc-Praxis-V2.xlsm",
    sheet: "Contract",
    excelCellOrRange: "D17",
    mappedField: "contract.terms.packagingUnit",
    docTypes: ["invoice", "packing_list", "shipping_instructions"],
  },
  {
    workbook: "Coffee Doc-Praxis-V2.xlsm",
    sheet: "Contract",
    excelCellOrRange: "D18",
    mappedField: "contract.terms.quantityContract",
    docTypes: ["invoice", "packing_list", "shipping_instructions"],
  },
  {
    workbook: "Coffee Doc-Praxis-V2.xlsm",
    sheet: "Contract",
    excelCellOrRange: "D26",
    mappedField: "output.weights.netWeightKg",
    docTypes: ["invoice", "packing_list", "shipping_instructions"],
    notes: "Derived by formula based on selected packing UoM.",
  },
  {
    workbook: "Coffee Doc-Praxis-V2.xlsm",
    sheet: "Contract",
    excelCellOrRange: "H26",
    mappedField: "output.weights.grossWeightKg",
    docTypes: ["invoice", "packing_list", "shipping_instructions"],
  },
  {
    workbook: "Coffee Doc-Praxis-V2.xlsm",
    sheet: "Contract",
    excelCellOrRange: "D30",
    mappedField: "output.weights.netWeightMt",
    docTypes: ["invoice", "packing_list", "shipping_instructions"],
  },
  {
    workbook: "Coffee Doc-Praxis-V2.xlsm",
    sheet: "Contract",
    excelCellOrRange: "H30",
    mappedField: "output.weights.grossWeightMt",
    docTypes: ["invoice", "packing_list"],
  },
  {
    workbook: "Coffee Doc-Praxis-V2.xlsm",
    sheet: "Contract",
    excelCellOrRange: "D34",
    mappedField: "shipment.containerCount",
    docTypes: ["packing_list", "shipping_instructions"],
    notes: "ROUNDUP(netKg/19200,0)",
  },
  {
    workbook: "Coffee Doc-Praxis-V2.xlsm",
    sheet: "Contract",
    excelCellOrRange: "D37",
    mappedField: "contract.terms.origin",
    docTypes: ["invoice", "packing_list", "shipping_instructions"],
  },
  {
    workbook: "Coffee Doc-Praxis-V2.xlsm",
    sheet: "Contract",
    excelCellOrRange: "D38",
    mappedField: "contract.terms.grade",
    docTypes: ["invoice", "packing_list", "shipping_instructions"],
  },
  {
    workbook: "Coffee Doc-Praxis-V2.xlsm",
    sheet: "Contract",
    excelCellOrRange: "F54",
    mappedField: "contract.certRange",
    docTypes: ["invoice", "packing_list", "shipping_instructions"],
  },

  {
    workbook: "Coffee Doc-Praxis-V2.xlsm",
    sheet: "Shipping Instruction",
    excelCellOrRange: "C5",
    mappedField: "shipping.destination",
    docTypes: ["invoice", "packing_list", "shipping_instructions"],
  },
  {
    workbook: "Coffee Doc-Praxis-V2.xlsm",
    sheet: "Shipping Instruction",
    excelCellOrRange: "C7",
    mappedField: "shipping.shippingLine",
    docTypes: ["shipping_instructions"],
  },
  {
    workbook: "Coffee Doc-Praxis-V2.xlsm",
    sheet: "Shipping Instruction",
    excelCellOrRange: "C13",
    mappedField: "shipping.portOfLoading",
    docTypes: ["invoice", "packing_list", "shipping_instructions"],
  },
  {
    workbook: "Coffee Doc-Praxis-V2.xlsm",
    sheet: "Shipping Instruction",
    excelCellOrRange: "C22",
    mappedField: "shipping.bagMarkings",
    docTypes: ["invoice", "packing_list", "shipping_instructions"],
  },
  {
    workbook: "Coffee Doc-Praxis-V2.xlsm",
    sheet: "Shipping Instruction",
    excelCellOrRange: "C25,C27,C29",
    mappedField: "parties.consigneeNotifySecondNotify",
    docTypes: ["invoice", "packing_list", "shipping_instructions"],
    notes: "Overrides are available in F25/F27/F29 and LC sheets.",
  },

  {
    workbook: "Coffee Doc-Praxis-V2.xlsm",
    sheet: "Bank & LC",
    excelCellOrRange: "C4",
    mappedField: "banking.lcNumber",
    docTypes: ["invoice"],
  },
  {
    workbook: "Coffee Doc-Praxis-V2.xlsm",
    sheet: "Bank & LC",
    excelCellOrRange: "C12,C14,C18,C20,C22,C25,C26,C27",
    mappedField: "banking.overrides",
    docTypes: ["invoice", "packing_list", "shipping_instructions"],
    notes: "Feeds consolidation layer Contract-SI-LC columns I/J.",
  },

  {
    workbook: "Coffee Doc-Praxis-V2.xlsm",
    sheet: "Bookings",
    excelCellOrRange: "B4,C5,C6,C7,B43",
    mappedField: "shipment.bookingRefAndVesselInfo",
    docTypes: ["packing_list", "shipping_instructions"],
  },

  {
    workbook: "Coffee Doc-Praxis-V2.xlsm",
    sheet: "Processing",
    excelCellOrRange: "D4,D6,D9",
    mappedField: "processing.moistureStationAddress",
    docTypes: ["packing_list", "shipping_instructions"],
  },

  {
    workbook: "Coffee Doc-Praxis-V2.xlsm",
    sheet: "Contract-SI-LC",
    excelCellOrRange: "K7:K32",
    mappedField: "resolved.finalFields",
    docTypes: ["invoice", "packing_list", "shipping_instructions"],
    notes: "Final resolved values use priority J > I > H > G > F.",
  },

  {
    workbook: "Coffee Doc-Praxis-V2.xlsm",
    sheet: "Commercial Invoice",
    excelCellOrRange: "C10,C11,E12,K12,C13,C15,H15,C16,H16,B20,C21,D21,F21,G21,J21,M21,C27,C30",
    mappedField: "invoice.templateBindings",
    docTypes: ["invoice"],
    notes: "Main print cells bound from Contract-SI-LC, Contract, Form Configuration.",
  },
  {
    workbook: "Coffee Doc-Praxis-V2.xlsm",
    sheet: "Commercial Invoice(ICC)",
    excelCellOrRange:
      "I11,I12,I13,C14,I15,I18,I19,C22,C28,D28,F28,H28,L28,M28,O28,P28,C30,C35,C36,C37,C38,M35:M38,C40,C41,C42,C43,C44,C47,C49,C51",
    mappedField: "invoiceIcc.templateBindings",
    docTypes: ["invoice"],
    notes:
      "Formula links verified from workbook sheet XML (sheet12): Contract, Contract-SI-LC, Form Configuration, Bank & LC, and Bookings feed ICC output.",
  },
  {
    workbook: "Coffee Doc-Praxis-V2.xlsm",
    sheet: "Packing List",
    excelCellOrRange: "B9,B10,B11,E12,B13,I13,B14,I14,I15,B16,B17,G17,J17,B18,B19,D20,K20,H22:H31,B34,B35",
    mappedField: "packingList.templateBindings",
    docTypes: ["packing_list"],
  },
  {
    workbook: "Coffee Doc-Praxis-V2.xlsm",
    sheet: "SI",
    excelCellOrRange: "E10,E11,E12,E13,E18,E19,E20,H21,O21,E23,E27,E29,E30,E31",
    mappedField: "shippingInstruction.templateBindings",
    docTypes: ["shipping_instructions"],
  },
  {
    workbook: "Coffee Doc-Praxis-V2.xlsm",
    sheet: "Certificate of Quality",
    excelCellOrRange: "B9,C11:C25,B28:D37,C39",
    mappedField: "certificateOfQuality.templateBindings",
    docTypes: ["quality_certificate"],
    notes:
      "Sheet17 formulas verified in workbook XML: header/party/weight fields from Contract-SI-LC, Form Configuration, Bookings, Processing; bottom container table from Staffing rows.",
  },
  {
    workbook: "Coffee Doc-Praxis-V2.xlsm",
    sheet: "Certificate of Weight",
    excelCellOrRange: "C9:C21,C25:I34,H35:I35",
    mappedField: "certificateOfWeight.templateBindings",
    docTypes: ["weight_certificate"],
    notes:
      "Sheet18 formulas verified in workbook XML: party/summary fields from Contract-SI-LC, Contract, and Form Configuration; container rows from Staffing with per-container bag and weight calculations.",
  },
];

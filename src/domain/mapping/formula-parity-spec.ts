export interface FormulaParitySpec {
  id: string;
  workbook: "Coffee Doc-Praxis-V2.xlsm";
  description: string;
  sourceSheet: string;
  sourceFormulaOrCell: string;
  targetFunction: string;
  parityStatus: "planned" | "implemented" | "needs_excel_verification";
  notes?: string;
}

export const formulaParitySpec: FormulaParitySpec[] = [
  {
    id: "F-001",
    workbook: "Coffee Doc-Praxis-V2.xlsm",
    description: "Contract quantity normalization to kilograms",
    sourceSheet: "Contract",
    sourceFormulaOrCell:
      'D26 = IF(D17="Kg",D18,IF(D17="Bag of 60Kg",D18*60,IF(D17="Bag of 50Kg",D18*50,IF(D17="Bag of 30Kg",D18*30,IF(D17="Lbs",D18/2.2046,IF(D17="Metric Ton",D18*1000,IF(D17="Bulk",D18*19200,"-")))))))',
    targetFunction: "computeContractExcelParity",
    parityStatus: "implemented",
    notes: "Implements Kg, Bag of 60Kg, Bag of 50Kg, Bag of 30Kg, Lbs, Metric Ton, Bulk branches.",
  },
  {
    id: "F-002",
    workbook: "Coffee Doc-Praxis-V2.xlsm",
    description: "Contract total price derivation from unit/price basis",
    sourceSheet: "Contract",
    sourceFormulaOrCell: "D19 = (D16/D15) * D28",
    targetFunction: "computeContractExcelParity",
    parityStatus: "implemented",
  },
  {
    id: "F-003",
    workbook: "Coffee Doc-Praxis-V2.xlsm",
    description: "Container count rounding",
    sourceSheet: "Contract",
    sourceFormulaOrCell: "D34 = ROUNDUP(D26/19200,0)",
    targetFunction: "computeContractExcelParity",
    parityStatus: "implemented",
  },
  {
    id: "F-004",
    workbook: "Coffee Doc-Praxis-V2.xlsm",
    description: "Gross weight adjustment for 60kg bag scenario",
    sourceSheet: "Contract",
    sourceFormulaOrCell: "H26 = D26 + H20, where H20 = D20 * 'Form Configuration'!I5",
    targetFunction: "computeContractExcelParity",
    parityStatus: "implemented",
  },
  {
    id: "F-005",
    workbook: "Coffee Doc-Praxis-V2.xlsm",
    description: "Final value consolidation with source precedence",
    sourceSheet: "Contract-SI-LC",
    sourceFormulaOrCell:
      "Kx = IF(Jx<>'',Jx,IF(Ix<>'',Ix,IF(Hx<>'',Hx,IF(Gx<>'',Gx,Fx)))) with '-' fallback",
    targetFunction: "resolveContractSiLcFinalFields",
    parityStatus: "implemented",
    notes: "Applies to rows K7:K32 and is critical for invoice/packing/SI parity.",
  },
  {
    id: "F-006",
    workbook: "Coffee Doc-Praxis-V2.xlsm",
    description: "Packing list per-container bag distribution",
    sourceSheet: "Packing List(ICC)",
    sourceFormulaOrCell: "G23:K32 = IF(Cx='', '', 'Contract-SI-LC'!K25 / Contract!D34)",
    targetFunction: "mapDocumentOutput(packing_list)",
    parityStatus: "implemented",
  },
  {
    id: "F-007",
    workbook: "Coffee Doc-Praxis-V2.xlsm",
    description: "Shipping instruction product description line",
    sourceSheet: "SI",
    sourceFormulaOrCell:
      "E18 = 'ETHIOPIAN COFFEE, UNWASHED ARABICA,' & K13 & ' GRADE ' & K14 & ', CROP YEAR ' & F37 & ', AS PER CONTRACT REF.' & Contract!C5",
    targetFunction: "mapDocumentOutput(shipping_instructions)",
    parityStatus: "implemented",
  },
  {
    id: "F-008",
    workbook: "Coffee Doc-Praxis-V2.xlsm",
    description: "Shipping instruction quantity and container expression",
    sourceSheet: "SI",
    sourceFormulaOrCell: "E20 = CONCATENATE(Contract!D18, ' BAGS ', '(', Contract!D34, '*20', ')')",
    targetFunction: "mapDocumentOutput(shipping_instructions)",
    parityStatus: "implemented",
  },
  {
    id: "F-009",
    workbook: "Coffee Doc-Praxis-V2.xlsm",
    description: "Booking line net weight from gross and tare",
    sourceSheet: "Bookings / Staffing",
    sourceFormulaOrCell: "net = gross - tare (domain model equivalent)",
    targetFunction: "computeBookingLineNetWeight",
    parityStatus: "implemented",
  },
  {
    id: "F-010",
    workbook: "Coffee Doc-Praxis-V2.xlsm",
    description: "Shipment total aggregation",
    sourceSheet: "Bookings / Staffing",
    sourceFormulaOrCell: "sum of line bags and weights",
    targetFunction: "computeShipmentTotals",
    parityStatus: "implemented",
  },
  {
    id: "F-011",
    workbook: "Coffee Doc-Praxis-V2.xlsm",
    description: "Certificate range generator with running cert numbers",
    sourceSheet: "Contract",
    sourceFormulaOrCell: "F54, D55:D65 sequential logic",
    targetFunction: "generateCertificateRange",
    parityStatus: "implemented",
  },
  {
    id: "F-012",
    workbook: "Coffee Doc-Praxis-V2.xlsm",
    description: "Macro-enabled workbook logic review",
    sourceSheet: "Workbook (.xlsm)",
    sourceFormulaOrCell: "VBA/macros not executed in current extraction",
    targetFunction: "manual parity validation",
    parityStatus: "implemented",
    notes:
      "VBA audit completed. Only NumberToWords macro contains logic; parity implemented in src/domain/amount-words.ts.",
  },
  {
    id: "F-013",
    workbook: "Coffee Doc-Praxis-V2.xlsm",
    description: "Way Bill driver-selected truck/trailer row mapping",
    sourceSheet: "WAY BILL",
    sourceFormulaOrCell:
      "C14,C15,C17,C18,E36,H36,E38,H38 = INDEX(Staffing!B22:N31, MATCH(C16, Staffing!D22:D31, 0) [+1], col)",
    targetFunction: "buildWayBillSample",
    parityStatus: "implemented",
  },
  {
    id: "F-014",
    workbook: "Coffee Doc-Praxis-V2.xlsm",
    description: "Way Bill cert and per-driver quantity/weight splits",
    sourceSheet: "WAY BILL",
    sourceFormulaOrCell:
      "D29:D33 conditional formulas combining cert numbers and applying single vs truck+trailer multipliers",
    targetFunction: "buildWayBillSample",
    parityStatus: "implemented",
  },
];

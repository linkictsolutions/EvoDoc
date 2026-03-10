export type UserRole = "admin" | "editor" | "viewer";

export type ContractStatus = "draft" | "active" | "closed";

export type DocumentType = "invoice" | "packing_list" | "shipping_instructions";
export type DocumentFamily = "commercial_invoice" | "packing_list" | "shipping_instruction";
export type DocumentVariant = "permit" | "final" | "standard";

export type DocumentStatus =
  | "draft"
  | "under_review"
  | "approved"
  | "superseded"
  | "voided";

export type ApprovalDecision = "approve" | "reject";

export interface Timestamped {
  createdAt: string;
  updatedAt: string;
}

export interface Organization extends Timestamped {
  id: string;
  name: string;
  code: string;
  status: "active" | "inactive";
  defaultCurrency: string;
  defaultUnits: "kg" | "lb";
}

export interface OrgUser extends Timestamped {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  isApprover: boolean;
  orgId: string;
}

export interface Customer extends Timestamped {
  id: string;
  orgId: string;
  name: string;
  shortName?: string;
  address: string;
  country: string;
  contactName?: string;
  contactEmail?: string;
  taxId?: string;
}

export interface Item extends Timestamped {
  id: string;
  orgId: string;
  itemCode: string;
  name: string;
  description?: string;
  hsCode?: string;
  origin?: string;
  grade?: string;
  defaultPackagingUnit?: string;
  defaultBagWeightKg?: number;
  active: boolean;
}

export interface ContractTerms {
  quality: string;
  origin: string;
  grade: string;
  quantityBags: number;
  bagWeightKg: number;
  unitPrice: number;
  currency: string;
  packagingUnit: string;
  priceUom?: string;
  priceUnitForPrice?: number;
  shipmentPeriod?: string;
  paymentTerm?: string;
  deliveryTerm?: string;
  cropYear?: string;
  lastCertNo?: number;
}

export interface ShippingInstructions {
  destinationPort: string;
  shippingLine: string;
  serviceContract?: string;
  alternative1?: string;
  alternative1ServiceContract?: string;
  alternative1Selected?: boolean;
  alternative2?: string;
  alternative2ServiceContract?: string;
  portOfLoading: string;
  quantityValue?: string;
  qualityValue?: string;
  packagingValue?: string;
  noOfBagsValue?: string;
  containerCountValue?: string;
  shipmentMonth?: string;
  bagMarkings?: string;
  description?: string;
  vesselName?: string;
  bookingNumber?: string;
  consignee?: string;
  revisedConsignee?: string;
  notifyParty?: string;
  revisedNotifyParty?: string;
  secondNotify?: string;
  revisedSecondNotify?: string;
}

export interface BankingPaymentInfo {
  lcNumber?: string;
  permitNumber?: string;
  sender?: string;
  receiver?: string;
  applicant?: string;
  portOfLoading?: string;
  portOfDischarge?: string;
  latestShipmentDate?: string;
  goodsDescription?: string;
  noOfBags?: string;
  consignee?: string;
  notify?: string;
  secondNotify?: string;
  currencyAmount?: string;
  revisedConsignee?: string;
  revisedNotify?: string;
  revisedSecondNotify?: string;
  beneficiaryBank?: string;
  bankAddress?: string;
  correspondentBank?: string;
  beneficiaryAccountNumber?: string;
  accountNumber?: string;
  swiftCode?: string;
}

export interface ProcessingInfo {
  stationName: string;
  stationAddress: string;
  moisturePercent: number;
}

export interface Contract extends Timestamped {
  id: string;
  orgId: string;
  contractNumber: string;
  customerId: string;
  status: ContractStatus;
  terms: ContractTerms;
  shipping: ShippingInstructions;
  banking: BankingPaymentInfo;
  processing: ProcessingInfo;
  derived?: {
    totalPrice: number;
    quantityKg: number;
    quantityLb: number;
    quantityMt: number;
    grossWeightKg: number;
    grossWeightMt: number;
    containerCount: number;
    noOfBags: number;
  };
  createdBy: string;
}

export interface BookingLine {
  lineNo: number;
  truckNumber?: string;
  containerNumber?: string;
  sealNumber?: string;
  bags: number;
  grossWeightKg: number;
  tareWeightKg: number;
  netWeightKg?: number;
}

export interface ShipmentTotals {
  totalBags: number;
  totalGrossWeightKg: number;
  totalTareWeightKg: number;
  totalNetWeightKg: number;
}

export interface Shipment extends Timestamped {
  id: string;
  orgId: string;
  contractId: string;
  status: "draft" | "ready";
  vessel?: string;
  voyageNo?: string;
  bookingReference?: string;
  bookingLines: BookingLine[];
  totals: ShipmentTotals;
  validationWarnings?: string[];
}

export interface TemplateMetadata {
  templateId: string;
  templateVersion: string;
  docType: DocumentType;
  effectiveFrom: string;
  fieldMap: Record<string, string>;
}

export interface DocumentInputSnapshot<TDocType extends DocumentType = DocumentType> {
  docType: TDocType;
  docVariant?: DocumentVariant;
  contract: Contract;
  customer: Customer;
  shipment: Shipment;
}

export interface DocumentOutputSnapshot<TDocType extends DocumentType = DocumentType> {
  docType: TDocType;
  docVariant?: DocumentVariant;
  title: string;
  sections: Array<{
    heading: string;
    rows: Array<{ label: string; value: string }>;
  }>;
  totals: Record<string, string>;
}

export interface GeneratedDocument extends Timestamped {
  id: string;
  orgId: string;
  contractId: string;
  shipmentId?: string;
  docType: DocumentType;
  documentFamily: DocumentFamily;
  docVariant: DocumentVariant;
  revisionNumber: number;
  status: DocumentStatus;
  templateVersion: string;
  logicVersion: string;
  snapshotHash: string;
  approvedSnapshotHash?: string;
  inputSnapshot: DocumentInputSnapshot;
  outputSnapshot: DocumentOutputSnapshot;
  printUrl?: string;
  generatedAt: string;
  generatedBy: string;
  validationWarnings?: string[];
  approvedAt?: string;
  approvedBy?: string;
  reviewComment?: string;
}

export interface AuditLog {
  id: string;
  orgId: string;
  actorUid: string;
  action: string;
  targetPath: string;
  before: unknown;
  after: unknown;
  timestamp: string;
  requestId: string;
}

export interface Notification {
  id: string;
  orgId: string;
  type: "review_requested" | "approved" | "rejected" | "system";
  title: string;
  message: string;
  targetPath: string;
  read: boolean;
  createdAt: string;
}

export interface Actor {
  uid: string;
  email: string;
  orgId: string;
  role: UserRole;
  isApprover: boolean;
}

export interface ApiEnvelope<T> {
  ok: boolean;
  data?: T;
  error?: string;
  requestId: string;
}

export type SourceInputType =
  | "contract_sheet"
  | "shipping_instruction_sheet"
  | "bank_lc_sheet";

export interface ContractSourceInput<TPayload = unknown> extends Timestamped {
  id: string;
  orgId: string;
  contractId: string;
  sourceType: SourceInputType;
  payload: TPayload;
  lastRequestId?: string;
  updatedBy: string;
}

export interface SourceInputRevision<TPayload = unknown> {
  id: string;
  sourceType: SourceInputType;
  payload: TPayload;
  requestId: string;
  actorUid: string;
  timestamp: string;
}

export type UserRole = "admin" | "editor" | "viewer";

export type ContractStatus = "draft" | "active" | "closed";

export type DocumentType =
  | "invoice"
  | "packing_list"
  | "shipping_instructions"
  | "quality_certificate"
  | "weight_certificate"
  | "way_bill"
  | "ico_certificate"
  | "bill_of_lading";
export type DocumentFamily =
  | "commercial_invoice"
  | "packing_list"
  | "shipping_instruction"
  | "certificate_of_quality"
  | "certificate_of_weight"
  | "way_bill"
  | "ico_certificate"
  | "bill_of_lading";
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

export interface PackagingDefinition {
  label: string;
  uom: string;
  netWeightKg: number;
  tareWeightKg: number;
  grossWeightKg: number;
}

export interface DocumentBrandingSlotSettings {
  imageDataUrl?: string;
  heightMm: number;
  fit: "cover" | "contain";
  positionXPercent: number;
  positionYPercent: number;
}

export interface DocumentBrandingToggle {
  header: boolean;
  footer: boolean;
}

export interface DocumentBrandingSettings {
  header: DocumentBrandingSlotSettings;
  footer: DocumentBrandingSlotSettings;
  applyByDocType: Record<DocumentType, DocumentBrandingToggle>;
}

export interface BeneficiaryBankProfile {
  beneficiaryBank: string;
  beneficiaryBankAddress?: string;
  swiftNumber?: string;
  beneficiaryAccountNumbers: string[];
}

export interface AttachmentRef {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  downloadUrl: string;
  uploadedAt: string;
}

export interface CompanyConfiguration extends Timestamped {
  orgId: string;
  sellerName: string;
  sellerAddress: string;
  sellerAmharicName?: string;
  companyEmail?: string;
  companyPhone?: string;
  defaultOrigin: string;
  defaultHsCode: string;
  icoReferencePrefix: string;
  placeOfIssue: string;
  transitorCompanyName?: string;
  transitorPhoneNumber?: string;
  transitorLocation?: string;
  currencies: string[];
  paymentTerms: string[];
  deliveryTerms: string[];
  priceUoms: string[];
  packagingUnits: string[];
  movementTypes: string[];
  documentBranding: DocumentBrandingSettings;
  bulkReferenceKg: number;
  packagingDefinitions: PackagingDefinition[];
  beneficiaryBanks: BeneficiaryBankProfile[];
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
  beneficiarySwiftCode?: string;
  correspondentBank?: string;
  correspondentBankAddress?: string;
  beneficiaryAccountNumber?: string;
  accountNumber?: string;
  swiftCode?: string;
  correspondentSwiftCode?: string;
}

export interface ProcessingInfo {
  stationName: string;
  stationAddress: string;
  moisturePercent: number;
}

export interface IcoDocumentOverrides {
  exporterConsignor?: string;
  notifyAddress?: string;
  internalReferenceNo?: string;
  countryCode?: string;
  portCode?: string;
  serialNo?: string;
  producingCountry?: string;
  countryDestination?: string;
  dateOfExport?: string;
  countryTransShipment?: string;
  nameOfCarrier?: string;
  icoIdentificationMark?: string;
  otherMarksIcoNo?: string;
  otherMarksCertNo?: string;
  descriptionOtherSpecify?: string;
  partBText?: string;
  issuingDate?: string;
  certifyingDate?: string;
  place?: string;
}

export interface BillOfLadingInfo {
  billType?: "ORIGINAL BILL No." | "WAYBILL No.";
  billNo?: string;
  noOfCopyBills?: string;
  shipperReferenceType?: "Booking Ref" | "Shipper Ref.";
  shipperReferenceValue?: string;
  placeOfReceipt?: string;
  placeOfDelivery?: string;
  shippedOnBoardDate?: string;
  placeAndDateOfIssue?: string;
  carrierAgentsEndorsements?: string;
  notify2?: string;
  notify3?: string;
  declaredValue?: string;
  freightAndChargesText?: string;
  measurement?: string;
  cargoMarksText?: string;
  descriptionOverride?: string;
  movementType?: string;
  freightParty?: string;
  riderDescriptions?: string[];
}

export type VehicleKind = "TRUCK" | "TRAILER";

export interface BookingEntry {
  rowNo: number;
  vehicleNo?: number;
  vehicleType: VehicleKind;
  plateNo?: string;
  driverName?: string;
  driverPhoneNo?: string;
  djiboutiPhoneNo?: string;
  licenseNo?: string;
  containerNumber?: string;
  sealNumber?: string;
  secondSealNumber?: string;
  tareWeightKg?: number;
}

export interface BookingsSheet extends Timestamped {
  orgId: string;
  contractId: string;
  bookingNumber?: string;
  shippingLine?: string;
  vesselName?: string;
  voyageNo?: string;
  freeDays?: string;
  billOfLadingNumber?: string;
  hasSecondSeal?: boolean;
  entries: BookingEntry[];
}

export interface StaffingInstructionRow {
  rowNo: number;
  vehicleNo?: number;
  vehicleType: VehicleKind;
  plateNo?: string;
  driverName?: string;
  driverPhoneNo?: string;
  licenseNo?: string;
  containerNumber?: string;
  sealNumber?: string;
  certNumber?: string;
  tareWeightKg?: number;
  firstWeightKg?: number;
  secondWeightKg?: number;
  netWeightKg?: number;
  doNumber?: string;
}

export interface StaffingFinalRow {
  rowNo: number;
  vehicleNo?: number;
  vehicleType: VehicleKind;
  plateNo?: string;
  driverName?: string;
  driverPhoneNo?: string;
  licenseNo?: string;
  containerNumber?: string;
  sealNumber?: string;
  certNumber?: string;
  tareWeightKg?: number;
  firstWeightKg?: number;
  secondWeightKg?: number;
  netWeightKg?: number;
  doNumber?: string;
}

export interface StaffingSheet extends Timestamped {
  orgId: string;
  contractId: string;
  instructionRows: StaffingInstructionRow[];
}

export interface ProcessingSheet extends Timestamped {
  orgId: string;
  contractId: string;
  moisturePercent: number;
  stationName: string;
  stationNameLocal?: string;
  stationAddress: string;
}

export interface ExecutionData {
  bookings?: BookingsSheet;
  staffing?: StaffingSheet & { finalRows: StaffingFinalRow[] };
  processing?: ProcessingSheet;
}

export interface Contract extends Timestamped {
  id: string;
  orgId: string;
  contractNumber: string;
  documentRefs?: Partial<Record<DocumentFamily, string>>;
  icoOverrides?: IcoDocumentOverrides;
  billOfLading?: BillOfLadingInfo;
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
  companyConfiguration?: CompanyConfiguration;
  executionData?: ExecutionData;
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
  templateLayout?: string;
  logicVersion: string;
  snapshotHash: string;
  approvedSnapshotHash?: string;
  inputSnapshot: DocumentInputSnapshot;
  outputSnapshot: DocumentOutputSnapshot;
  isFinal?: boolean;
  finalizedAt?: string;
  finalizedBy?: string;
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
  | "bank_lc_sheet"
  | "bill_of_lading_sheet";

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

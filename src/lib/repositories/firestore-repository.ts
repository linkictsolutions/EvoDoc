import { adminDb } from "@/lib/firebase/admin";
import { withTimestamps } from "@/domain/contracts";
import { assertTransition } from "@/domain/workflow";
import type {
  Actor,
  BookingsSheet,
  CompanyConfiguration,
  Contract,
  ContractSourceInput,
  Customer,
  DocumentFamily,
  ExecutionData,
  GeneratedDocument,
  IcoDocumentOverrides,
  Item,
  Notification,
  AuditLog,
  ProcessingSheet,
  SourceInputRevision,
  SourceInputType,
  StaffingSheet,
  Shipment,
} from "@/types/models";

function nowIso(): string {
  return new Date().toISOString();
}

function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .map((entry) => stripUndefinedDeep(entry))
      .filter((entry) => entry !== undefined) as T;
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entry]) => entry !== undefined)
        .map(([key, entry]) => [key, stripUndefinedDeep(entry)]),
    ) as T;
  }

  return value;
}

function orgPath(orgId: string): string {
  return `organizations/${orgId}`;
}

function companyConfigurationPath(orgId: string): string {
  return `${orgPath(orgId)}/settings/companyConfiguration`;
}

function executionPath(orgId: string, contractId: string, key: "bookings" | "staffing" | "processing"): string {
  return `${orgPath(orgId)}/contracts/${contractId}/execution/${key}`;
}

async function deleteCollectionTree(
  collectionRef: FirebaseFirestore.CollectionReference,
): Promise<number> {
  let deletedCount = 0;
  const docs = await collectionRef.listDocuments();

  for (const docRef of docs) {
    deletedCount += await deleteDocumentTree(docRef);
  }

  return deletedCount;
}

async function deleteDocumentTree(
  docRef: FirebaseFirestore.DocumentReference,
): Promise<number> {
  let deletedCount = 0;
  const subcollections = await docRef.listCollections();

  for (const subcollection of subcollections) {
    deletedCount += await deleteCollectionTree(subcollection);
  }

  await docRef.delete();
  return deletedCount + 1;
}

async function deleteByTargetPathPrefixes(
  collectionPath: string,
  prefixes: string[],
): Promise<number> {
  if (prefixes.length === 0) {
    return 0;
  }

  const snapshot = await adminDb.collection(collectionPath).get();
  const refsToDelete = snapshot.docs
    .filter((doc) => {
      const targetPath = doc.get("targetPath");
      return typeof targetPath === "string"
        && prefixes.some((prefix) => targetPath.startsWith(prefix));
    })
    .map((doc) => doc.ref);

  if (refsToDelete.length === 0) {
    return 0;
  }

  const chunkSize = 400;
  for (let index = 0; index < refsToDelete.length; index += chunkSize) {
    const batch = adminDb.batch();
    refsToDelete.slice(index, index + chunkSize).forEach((ref) => batch.delete(ref));
    await batch.commit();
  }

  return refsToDelete.length;
}

function normalizeContractIdentifier(value: string): string {
  return value.trim();
}

function assertValidContractDocumentId(contractId: string): void {
  if (!contractId) {
    throw new Error("Contract number is required.");
  }

  if (contractId.includes("/")) {
    throw new Error("Contract number cannot contain '/'.");
  }
}

export async function listContracts(orgId: string) {
  const snapshot = await adminDb.collection(`${orgPath(orgId)}/contracts`).orderBy("updatedAt", "desc").limit(50).get();

  return snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<Contract, "id">) }));
}

export async function findContractIdByNumber(orgId: string, contractNumber: string): Promise<string | undefined> {
  const normalizedNumber = normalizeContractIdentifier(contractNumber);
  if (!normalizedNumber) {
    return undefined;
  }

  const snapshot = await adminDb
    .collection(`${orgPath(orgId)}/contracts`)
    .where("contractNumber", "==", normalizedNumber)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return undefined;
  }

  return snapshot.docs[0].id;
}

export async function resolveContractId(orgId: string, contractIdOrNumber: string): Promise<string> {
  const normalized = normalizeContractIdentifier(contractIdOrNumber);
  if (!normalized) {
    throw new Error("Contract identifier is required.");
  }

  const directRef = adminDb.doc(`${orgPath(orgId)}/contracts/${normalized}`);
  const directSnap = await directRef.get();
  if (directSnap.exists) {
    return normalized;
  }

  const byNumber = await findContractIdByNumber(orgId, normalized);
  if (byNumber) {
    return byNumber;
  }

  throw new Error("Contract not found");
}

export async function getContract(orgId: string, contractId: string) {
  const resolvedContractId = await resolveContractId(orgId, contractId);
  const contractRef = adminDb.doc(`${orgPath(orgId)}/contracts/${resolvedContractId}`);
  const contractSnap = await contractRef.get();

  if (!contractSnap.exists) {
    throw new Error("Contract not found");
  }

  return { id: contractSnap.id, ...(contractSnap.data() as Omit<Contract, "id">) };
}

export async function getCustomer(orgId: string, customerId: string) {
  const customerRef = adminDb.doc(`${orgPath(orgId)}/customers/${customerId}`);
  const customerSnap = await customerRef.get();

  if (!customerSnap.exists) {
    throw new Error("Customer not found");
  }

  return { id: customerSnap.id, ...(customerSnap.data() as Omit<Customer, "id">) };
}

export async function listCustomers(orgId: string) {
  const snapshot = await adminDb
    .collection(`${orgPath(orgId)}/customers`)
    .orderBy("updatedAt", "desc")
    .limit(100)
    .get();

  return snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<Customer, "id">) }));
}

export async function upsertCustomer(
  orgId: string,
  customerId: string | undefined,
  customer: Omit<Customer, "id" | "createdAt" | "updatedAt">,
): Promise<string> {
  const collection = adminDb.collection(`${orgPath(orgId)}/customers`);
  const ref = customerId ? collection.doc(customerId) : collection.doc();
  const existing = await ref.get();

  await ref.set(withTimestamps(customer, existing.data() as { createdAt?: string }), { merge: true });

  return ref.id;
}

export async function countContractsByCustomerId(orgId: string, customerId: string): Promise<number> {
  const snapshot = await adminDb
    .collection(`${orgPath(orgId)}/contracts`)
    .where("customerId", "==", customerId)
    .limit(1)
    .get();

  return snapshot.size;
}

export async function deleteCustomer(orgId: string, customerId: string): Promise<void> {
  const ref = adminDb.doc(`${orgPath(orgId)}/customers/${customerId}`);
  await ref.delete();
}

export async function listItems(orgId: string) {
  const snapshot = await adminDb
    .collection(`${orgPath(orgId)}/items`)
    .orderBy("updatedAt", "desc")
    .limit(100)
    .get();

  return snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<Item, "id">) }));
}

export async function getCompanyConfiguration(orgId: string) {
  const ref = adminDb.doc(companyConfigurationPath(orgId));
  const snap = await ref.get();

  if (!snap.exists) {
    throw new Error("Company configuration not found");
  }

  return snap.data() as CompanyConfiguration;
}

export async function getBookingsSheet(orgId: string, contractId: string) {
  const ref = adminDb.doc(executionPath(orgId, contractId, "bookings"));
  const snap = await ref.get();
  if (!snap.exists) {
    throw new Error("Bookings sheet not found");
  }

  return snap.data() as BookingsSheet;
}

export async function upsertBookingsSheet(
  orgId: string,
  contractId: string,
  bookings: Omit<BookingsSheet, "createdAt" | "updatedAt">,
) {
  const ref = adminDb.doc(executionPath(orgId, contractId, "bookings"));
  const existing = await ref.get();

  await ref.set(withTimestamps(bookings, existing.data() as { createdAt?: string }), { merge: true });
  return ref.path;
}

export async function getStaffingSheet(orgId: string, contractId: string) {
  const ref = adminDb.doc(executionPath(orgId, contractId, "staffing"));
  const snap = await ref.get();
  if (!snap.exists) {
    throw new Error("Staffing sheet not found");
  }

  return snap.data() as StaffingSheet;
}

export async function upsertStaffingSheet(
  orgId: string,
  contractId: string,
  staffing: Omit<StaffingSheet, "createdAt" | "updatedAt">,
) {
  const ref = adminDb.doc(executionPath(orgId, contractId, "staffing"));
  const existing = await ref.get();

  await ref.set(withTimestamps(staffing, existing.data() as { createdAt?: string }), { merge: true });
  return ref.path;
}

export async function getProcessingSheet(orgId: string, contractId: string) {
  const ref = adminDb.doc(executionPath(orgId, contractId, "processing"));
  const snap = await ref.get();
  if (!snap.exists) {
    throw new Error("Processing sheet not found");
  }

  return snap.data() as ProcessingSheet;
}

export async function upsertProcessingSheet(
  orgId: string,
  contractId: string,
  processing: Omit<ProcessingSheet, "createdAt" | "updatedAt">,
) {
  const ref = adminDb.doc(executionPath(orgId, contractId, "processing"));
  const existing = await ref.get();

  await ref.set(withTimestamps(processing, existing.data() as { createdAt?: string }), { merge: true });
  return ref.path;
}

export async function getExecutionData(orgId: string, contractId: string): Promise<ExecutionData> {
  const [bookingsSnap, staffingSnap, processingSnap] = await Promise.all([
    adminDb.doc(executionPath(orgId, contractId, "bookings")).get(),
    adminDb.doc(executionPath(orgId, contractId, "staffing")).get(),
    adminDb.doc(executionPath(orgId, contractId, "processing")).get(),
  ]);

  return {
    bookings: bookingsSnap.exists ? (bookingsSnap.data() as BookingsSheet) : undefined,
    staffing: staffingSnap.exists ? ((staffingSnap.data() as StaffingSheet) as ExecutionData["staffing"]) : undefined,
    processing: processingSnap.exists ? (processingSnap.data() as ProcessingSheet) : undefined,
  };
}

export async function upsertCompanyConfiguration(
  orgId: string,
  companyConfiguration: Omit<CompanyConfiguration, "createdAt" | "updatedAt">,
) {
  const ref = adminDb.doc(companyConfigurationPath(orgId));
  const existing = await ref.get();

  await ref.set(
    withTimestamps(companyConfiguration, existing.data() as { createdAt?: string }),
    { merge: true },
  );

  return ref.path;
}

export async function upsertItem(
  orgId: string,
  itemId: string | undefined,
  item: Omit<Item, "id" | "createdAt" | "updatedAt">,
): Promise<string> {
  const collection = adminDb.collection(`${orgPath(orgId)}/items`);
  const ref = itemId ? collection.doc(itemId) : collection.doc();
  const existing = await ref.get();

  await ref.set(withTimestamps(item, existing.data() as { createdAt?: string }), { merge: true });

  return ref.id;
}

export async function getItem(orgId: string, itemId: string) {
  const ref = adminDb.doc(`${orgPath(orgId)}/items/${itemId}`);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new Error("Item not found");
  }

  return { id: snap.id, ...(snap.data() as Omit<Item, "id">) };
}

export async function deleteItem(orgId: string, itemId: string): Promise<void> {
  const ref = adminDb.doc(`${orgPath(orgId)}/items/${itemId}`);
  await ref.delete();
}

export async function upsertContract(
  orgId: string,
  contractId: string | undefined,
  contract: Omit<Contract, "id" | "createdAt" | "updatedAt" | "customerId">,
  customerId: string,
  createdBy: string,
): Promise<string> {
  const collection = adminDb.collection(`${orgPath(orgId)}/contracts`);
  const explicitContractId = normalizeContractIdentifier(contractId ?? "");
  const normalizedContractNumber = normalizeContractIdentifier(contract.contractNumber);
  const preferredDocId = explicitContractId || normalizedContractNumber;
  assertValidContractDocumentId(preferredDocId);
  const ref = collection.doc(preferredDocId);
  const existing = await ref.get();

  await ref.set(
    withTimestamps(
      {
        ...contract,
        customerId,
        createdBy,
      },
      existing.data() as { createdAt?: string },
    ),
    { merge: true },
  );

  return ref.id;
}

export async function setContractDocumentRef(
  orgId: string,
  contractId: string,
  family: DocumentFamily,
  refNo: string,
): Promise<string> {
  const ref = adminDb.doc(`${orgPath(orgId)}/contracts/${contractId}`);
  const existing = await ref.get();

  if (!existing.exists) {
    throw new Error("Contract not found");
  }

  const normalizedRefNo = refNo.trim();

  await ref.set(
    withTimestamps(
      {
        documentRefs: {
          [family]: normalizedRefNo,
        },
      },
      existing.data() as { createdAt?: string },
    ),
    { merge: true },
  );

  return normalizedRefNo;
}

export async function setContractIcoOverrides(
  orgId: string,
  contractId: string,
  overrides: IcoDocumentOverrides,
): Promise<IcoDocumentOverrides> {
  const ref = adminDb.doc(`${orgPath(orgId)}/contracts/${contractId}`);
  const existing = await ref.get();

  if (!existing.exists) {
    throw new Error("Contract not found");
  }

  const normalized = stripUndefinedDeep(overrides);

  await ref.set(
    withTimestamps(
      {
        icoOverrides: normalized,
      },
      existing.data() as { createdAt?: string },
    ),
    { merge: true },
  );

  return normalized;
}

export async function deleteContractCascade(orgId: string, contractIdOrNumber: string): Promise<{
  contractDocId: string;
  contractNumber: string;
  deletedContractDocuments: number;
  deletedAuditLogs: number;
  deletedNotifications: number;
}> {
  const contractDocId = await resolveContractId(orgId, contractIdOrNumber);
  const contract = await getContract(orgId, contractDocId);

  const contractRef = adminDb.doc(`${orgPath(orgId)}/contracts/${contractDocId}`);
  const contractSnap = await contractRef.get();
  const deletedContractDocuments = contractSnap.exists ? await deleteDocumentTree(contractRef) : 0;

  const deletedAuditLogs = await deleteByTargetPathPrefixes(
    `${orgPath(orgId)}/auditLogs`,
    [`organizations/${orgId}/contracts/${contractDocId}`],
  );

  const deletedNotifications = await deleteByTargetPathPrefixes(
    `${orgPath(orgId)}/notifications`,
    [
      `/app/contracts/${contract.contractNumber}`,
      `/app/contracts/${contractDocId}`,
    ],
  );

  return {
    contractDocId,
    contractNumber: contract.contractNumber,
    deletedContractDocuments,
    deletedAuditLogs,
    deletedNotifications,
  };
}

export async function upsertShipment(
  orgId: string,
  contractId: string,
  shipmentId: string | undefined,
  shipment: Omit<Shipment, "id" | "createdAt" | "updatedAt" | "orgId" | "contractId">,
): Promise<string> {
  const collection = adminDb.collection(`${orgPath(orgId)}/contracts/${contractId}/shipments`);
  const ref = shipmentId ? collection.doc(shipmentId) : collection.doc();
  const existing = await ref.get();

  await ref.set(
    withTimestamps(
      {
        ...shipment,
        orgId,
        contractId,
      },
      existing.data() as { createdAt?: string },
    ),
    { merge: true },
  );

  return ref.id;
}

export async function getShipment(orgId: string, contractId: string, shipmentId: string) {
  const ref = adminDb.doc(`${orgPath(orgId)}/contracts/${contractId}/shipments/${shipmentId}`);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new Error("Shipment not found");
  }

  return { id: snap.id, ...(snap.data() as Omit<Shipment, "id">) };
}

export async function createGeneratedDocument(
  orgId: string,
  contractId: string,
  payload: Omit<GeneratedDocument, "id" | "createdAt" | "updatedAt" | "orgId" | "contractId">,
): Promise<string> {
  const collection = adminDb.collection(`${orgPath(orgId)}/contracts/${contractId}/documents`);
  const ref = collection.doc();

  await ref.set(
    withTimestamps({
      ...payload,
      orgId,
      contractId,
    }),
  );

  return ref.id;
}

export async function listGeneratedDocuments(orgId: string, contractId: string) {
  const snapshot = await adminDb
    .collection(`${orgPath(orgId)}/contracts/${contractId}/documents`)
    .orderBy("generatedAt", "desc")
    .get();

  return snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<GeneratedDocument, "id">) }));
}

export async function getGeneratedDocument(orgId: string, contractId: string, docId: string) {
  const ref = adminDb.doc(`${orgPath(orgId)}/contracts/${contractId}/documents/${docId}`);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new Error("Document not found");
  }

  return { id: snap.id, ...(snap.data() as Omit<GeneratedDocument, "id">) };
}

export async function transitionDocument(
  orgId: string,
  contractId: string,
  docId: string,
  toStatus: GeneratedDocument["status"],
  actor: Actor,
  reviewComment?: string,
) {
  const ref = adminDb.doc(`${orgPath(orgId)}/contracts/${contractId}/documents/${docId}`);

  await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      throw new Error("Document not found");
    }

    const current = snap.data() as GeneratedDocument;
    assertTransition(current.status, toStatus);

    if (toStatus === "approved" && (!actor.isApprover || actor.role !== "admin")) {
      throw new Error("Only admin approvers can approve documents");
    }

    const updates: Partial<GeneratedDocument> = {
      status: toStatus,
      updatedAt: nowIso(),
      reviewComment,
    };

    if (toStatus === "approved") {
      updates.approvedAt = nowIso();
      updates.approvedBy = actor.uid;
      updates.approvedSnapshotHash = current.snapshotHash;
    }

    tx.set(ref, updates, { merge: true });
  });
}

export async function markGeneratedDocumentFinal(
  orgId: string,
  contractId: string,
  docId: string,
  actorUid: string,
) {
  const ref = adminDb.doc(`${orgPath(orgId)}/contracts/${contractId}/documents/${docId}`);

  await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      throw new Error("Document not found");
    }

    const current = snap.data() as GeneratedDocument;
    if (current.status !== "approved") {
      throw new Error("Only approved documents can be marked final.");
    }

    if (current.isFinal) {
      return;
    }

    tx.set(ref, {
      isFinal: true,
      finalizedAt: nowIso(),
      finalizedBy: actorUid,
      updatedAt: nowIso(),
    } satisfies Partial<GeneratedDocument>, { merge: true });
  });
}

export async function listNotifications(orgId: string, limit = 30) {
  const snapshot = await adminDb
    .collection(`${orgPath(orgId)}/notifications`)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  return snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<Notification, "id">) }));
}

export async function createNotification(orgId: string, payload: Omit<Notification, "id">) {
  const ref = adminDb.collection(`${orgPath(orgId)}/notifications`).doc();
  await ref.set(payload);
  return ref.id;
}

export async function appendAuditLog(
  orgId: string,
  actorUid: string,
  action: string,
  targetPath: string,
  before: unknown,
  after: unknown,
  requestId: string,
) {
  const sanitizedBefore = stripUndefinedDeep(before);
  const sanitizedAfter = stripUndefinedDeep(after);

  await adminDb.collection(`${orgPath(orgId)}/auditLogs`).add({
    actorUid,
    action,
    targetPath,
    before: sanitizedBefore,
    after: sanitizedAfter,
    timestamp: nowIso(),
    requestId,
  });
}

export async function listContractAuditLogs(orgId: string, contractId: string, limit = 50) {
  const snapshot = await adminDb
    .collection(`${orgPath(orgId)}/auditLogs`)
    .orderBy("timestamp", "desc")
    .limit(Math.max(limit * 3, 100))
    .get();

  const prefix = `organizations/${orgId}/contracts/${contractId}`;

  return snapshot.docs
    .map((doc) => ({ id: doc.id, ...(doc.data() as Omit<AuditLog, "id">) }))
    .filter((log) => log.targetPath.startsWith(prefix))
    .slice(0, limit);
}

export async function upsertContractSourceInput<TPayload>(
  orgId: string,
  contractId: string,
  sourceType: SourceInputType,
  payload: TPayload,
  actorUid: string,
  requestId: string,
): Promise<string> {
  const sourceRef = adminDb.doc(`${orgPath(orgId)}/contracts/${contractId}/sourceInputs/${sourceType}`);
  const existing = await sourceRef.get();
  const sanitizedPayload = stripUndefinedDeep(payload);

  await sourceRef.set(
    withTimestamps(
      {
        orgId,
        contractId,
        sourceType,
        payload: sanitizedPayload,
        lastRequestId: requestId,
        updatedBy: actorUid,
      },
      existing.data() as { createdAt?: string },
    ),
    { merge: true },
  );

  await sourceRef.collection("revisions").add({
    sourceType,
    payload: sanitizedPayload,
    requestId,
    actorUid,
    timestamp: nowIso(),
  } satisfies Omit<SourceInputRevision<TPayload>, "id">);

  return sourceType;
}

export async function getContractSourceInput<TPayload>(
  orgId: string,
  contractId: string,
  sourceType: SourceInputType,
) {
  const sourceRef = adminDb.doc(`${orgPath(orgId)}/contracts/${contractId}/sourceInputs/${sourceType}`);
  const snap = await sourceRef.get();

  if (!snap.exists) {
    throw new Error(`Source input not found: ${sourceType}`);
  }

  return {
    id: snap.id,
    ...(snap.data() as Omit<ContractSourceInput<TPayload>, "id">),
  };
}

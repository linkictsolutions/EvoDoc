import { adminDb } from "@/lib/firebase/admin";
import { withTimestamps } from "@/domain/contracts";
import { assertTransition } from "@/domain/workflow";
import type {
  Actor,
  CompanyConfiguration,
  Contract,
  ContractSourceInput,
  Customer,
  GeneratedDocument,
  Item,
  Notification,
  AuditLog,
  SourceInputRevision,
  SourceInputType,
  Shipment,
} from "@/types/models";

function nowIso(): string {
  return new Date().toISOString();
}

function orgPath(orgId: string): string {
  return `organizations/${orgId}`;
}

function companyConfigurationPath(orgId: string): string {
  return `${orgPath(orgId)}/settings/companyConfiguration`;
}

export async function listContracts(orgId: string) {
  const snapshot = await adminDb.collection(`${orgPath(orgId)}/contracts`).orderBy("updatedAt", "desc").limit(50).get();

  return snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<Contract, "id">) }));
}

export async function findContractIdByNumber(orgId: string, contractNumber: string): Promise<string | undefined> {
  const snapshot = await adminDb
    .collection(`${orgPath(orgId)}/contracts`)
    .where("contractNumber", "==", contractNumber)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return undefined;
  }

  return snapshot.docs[0].id;
}

export async function getContract(orgId: string, contractId: string) {
  const contractRef = adminDb.doc(`${orgPath(orgId)}/contracts/${contractId}`);
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

export async function upsertContract(
  orgId: string,
  contractId: string | undefined,
  contract: Omit<Contract, "id" | "createdAt" | "updatedAt" | "customerId">,
  customerId: string,
  createdBy: string,
): Promise<string> {
  const collection = adminDb.collection(`${orgPath(orgId)}/contracts`);
  const ref = contractId ? collection.doc(contractId) : collection.doc();
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
  await adminDb.collection(`${orgPath(orgId)}/auditLogs`).add({
    actorUid,
    action,
    targetPath,
    before,
    after,
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

  await sourceRef.set(
    withTimestamps(
      {
        orgId,
        contractId,
        sourceType,
        payload,
        lastRequestId: requestId,
        updatedBy: actorUid,
      },
      existing.data() as { createdAt?: string },
    ),
    { merge: true },
  );

  await sourceRef.collection("revisions").add({
    sourceType,
    payload,
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

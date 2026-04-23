import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { onDocumentWritten } from "firebase-functions/v2/firestore";

initializeApp();

const db = getFirestore();

export const onDocumentStatusChanged = onDocumentWritten(
  "organizations/{orgId}/contracts/{contractId}/documents/{docId}",
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();

    if (!after) {
      return;
    }

    if (before?.status === after.status) {
      return;
    }

    const { orgId, contractId, docId } = event.params;

    await db.collection(`organizations/${orgId}/notifications`).add({
      orgId,
      type: "system",
      title: "Document status changed",
      message: `Document ${docId} moved from ${before?.status ?? "none"} to ${after.status}.`,
      targetPath: `/app/contracts/${contractId}/documents/${docId}/review`,
      read: false,
      createdAt: new Date().toISOString(),
    });

    await db.collection(`organizations/${orgId}/auditLogs`).add({
      actorUid: after.updatedBy ?? "system",
      action: "document.status_changed.trigger",
      targetPath: `organizations/${orgId}/contracts/${contractId}/documents/${docId}`,
      before,
      after,
      timestamp: new Date().toISOString(),
      requestId: event.id,
    });
  },
);

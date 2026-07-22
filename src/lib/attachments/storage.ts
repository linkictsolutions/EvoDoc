import { randomUUID } from "crypto";
import type { AttachmentRef } from "@/types/models";
import { adminStorage } from "@/lib/firebase/admin";

const STAGE_PREFIX: Record<string, string> = {
  contract_sheet: "contract",
  shipping_instruction_sheet: "shipping",
  bank_lc_sheet: "bank-lc",
  bill_of_lading_sheet: "bill-of-lading",
};

function storageBucketName() {
  return process.env.FIREBASE_STORAGE_BUCKET
    || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
    || `${process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.appspot.com`;
}

function buildDownloadUrl(bucketName: string, storagePath: string, token: string) {
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(storagePath)}?alt=media&token=${token}`;
}

export async function saveContractAttachment({
  orgId,
  contractId,
  stage,
  fileName,
  mimeType,
  sizeBytes,
  buffer,
}: {
  orgId: string;
  contractId: string;
  stage: keyof typeof STAGE_PREFIX;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  buffer: Buffer;
}): Promise<AttachmentRef> {
  const stagePrefix = STAGE_PREFIX[stage];
  if (!stagePrefix) {
    throw new Error("Invalid attachment stage");
  }

  const id = randomUUID();
  const safeName = fileName.replace(/[^\w.\-() ]+/g, "_");
  const storagePath = `evodoc/${orgId}/contracts/${contractId}/attachments/${stagePrefix}/${id}_${safeName}`;
  const downloadToken = randomUUID();
  const bucket = adminStorage.bucket(storageBucketName());
  const storageFile = bucket.file(storagePath);

  await storageFile.save(buffer, {
    resumable: false,
    metadata: {
      contentType: mimeType,
      metadata: {
        firebaseStorageDownloadTokens: downloadToken,
      },
    },
  });

  return {
    id,
    fileName,
    mimeType,
    sizeBytes,
    storagePath,
    downloadUrl: buildDownloadUrl(bucket.name, storagePath, downloadToken),
    uploadedAt: new Date().toISOString(),
  };
}

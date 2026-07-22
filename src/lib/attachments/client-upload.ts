import type { AttachmentRef } from "@/types/models";
import { getFirebaseAuthClient } from "@/lib/firebase/client";
import type { ApiEnvelope } from "@/types/models";

async function buildUploadHeaders(): Promise<HeadersInit> {
  const headers: Record<string, string> = {};

  if (process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH === "true") {
    headers["x-dev-uid"] = "dev-admin";
    headers["x-dev-role"] = "admin";
    headers["x-dev-email"] = "dev-admin@example.com";
    headers["x-dev-approver"] = "true";
    return headers;
  }

  const token = await getFirebaseAuthClient().currentUser?.getIdToken();
  if (token) {
    headers.authorization = `Bearer ${token}`;
  }

  return headers;
}

export function uploadContractAttachment({
  contractId,
  orgId,
  stage,
  file,
  onProgress,
  signal,
}: {
  contractId: string;
  orgId: string;
  stage: "contract_sheet" | "shipping_instruction_sheet" | "bank_lc_sheet" | "bill_of_lading_sheet";
  file: File;
  onProgress?: (progress: number) => void;
  signal?: AbortSignal;
}): Promise<AttachmentRef> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("file", file);
    formData.append("orgId", orgId);
    formData.append("stage", stage);

    const timeoutId = window.setTimeout(() => {
      xhr.abort();
      reject(new Error("Upload timed out. Please try again."));
    }, 120_000);

    function cleanup() {
      window.clearTimeout(timeoutId);
    }

    xhr.upload.addEventListener("progress", (event) => {
      if (!event.lengthComputable) {
        return;
      }
      const progress = Math.min(99, Math.round((event.loaded / event.total) * 100));
      onProgress?.(progress);
    });

    xhr.addEventListener("load", () => {
      cleanup();
      let payload: ApiEnvelope<AttachmentRef>;
      try {
        payload = JSON.parse(xhr.responseText) as ApiEnvelope<AttachmentRef>;
      } catch {
        reject(new Error("Upload failed: invalid server response"));
        return;
      }

      if (xhr.status < 200 || xhr.status >= 300 || !payload.ok || !payload.data) {
        reject(new Error(payload.error ?? "Upload failed"));
        return;
      }

      onProgress?.(100);
      resolve(payload.data);
    });

    xhr.addEventListener("error", () => {
      cleanup();
      reject(new Error("Upload failed due to a network error"));
    });

    xhr.addEventListener("abort", () => {
      cleanup();
      reject(new Error("Upload cancelled"));
    });

    if (signal) {
      if (signal.aborted) {
        cleanup();
        reject(new Error("Upload cancelled"));
        return;
      }
      signal.addEventListener("abort", () => xhr.abort(), { once: true });
    }

    void (async () => {
      try {
        const headers = await buildUploadHeaders();
        xhr.open("POST", `/api/contracts/${encodeURIComponent(contractId)}/attachments/upload`);
        for (const [key, value] of Object.entries(headers)) {
          xhr.setRequestHeader(key, value);
        }
        xhr.send(formData);
      } catch (error) {
        cleanup();
        reject(error instanceof Error ? error : new Error("Upload failed"));
      }
    })();
  });
}

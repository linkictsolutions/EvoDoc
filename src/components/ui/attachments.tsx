"use client";

import { useMemo, useRef, useState, type RefObject } from "react";
import { getDownloadURL, ref as storageRef, uploadBytesResumable } from "firebase/storage";
import type { AttachmentRef } from "@/types/models";
import { getFirebaseStorageClient } from "@/lib/firebase/client";
import { useToast } from "@/components/ui/toast";

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const idx = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / Math.pow(1024, idx);
  return `${value.toFixed(value >= 10 || idx === 0 ? 0 : 1)} ${units[idx]}`;
}

function badgeClassFor(mimeType: string, fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  const key = mimeType.toLowerCase();
  const isPdf = key.includes("pdf") || ext === "pdf";
  const isWord = key.includes("word") || ["doc", "docx"].includes(ext);
  const isExcel = key.includes("spreadsheet") || ["xls", "xlsx", "csv"].includes(ext);
  const isImage = key.startsWith("image/") || ["png", "jpg", "jpeg", "webp"].includes(ext);

  if (isPdf) return { label: "PDF", className: "attachments-badge attachments-badge--pdf" };
  if (isWord) return { label: "DOC", className: "attachments-badge attachments-badge--doc" };
  if (isExcel) return { label: "XLS", className: "attachments-badge attachments-badge--xls" };
  if (isImage) return { label: "IMG", className: "attachments-badge attachments-badge--img" };
  return { label: "FILE", className: "attachments-badge attachments-badge--file" };
}

export function AttachmentsField({
  orgId,
  contractId,
  stage,
  value,
  onChange,
  label = "Attachments",
  helperText,
  embedded = false,
  inputRef: externalInputRef,
}: {
  orgId: string;
  contractId: string;
  stage: "contract_sheet" | "shipping_instruction_sheet" | "bank_lc_sheet" | "bill_of_lading_sheet";
  value: AttachmentRef[];
  onChange: (next: AttachmentRef[]) => void;
  label?: string;
  helperText?: string;
  embedded?: boolean;
  inputRef?: RefObject<HTMLInputElement | null>;
}) {
  const toast = useToast();
  const internalInputRef = useRef<HTMLInputElement | null>(null);
  const inputRef = externalInputRef ?? internalInputRef;
  const [uploadingIds, setUploadingIds] = useState<Record<string, number>>({});

  const attachments = value ?? [];
  const hasUploads = attachments.length > 0;

  const stagePrefix = useMemo(() => {
    if (stage === "contract_sheet") return "contract";
    if (stage === "shipping_instruction_sheet") return "shipping";
    if (stage === "bill_of_lading_sheet") return "bill-of-lading";
    return "bank-lc";
  }, [stage]);

  async function uploadFiles(files: FileList) {
    const storage = getFirebaseStorageClient();
    const list = Array.from(files);
    for (const file of list) {
      const id = (typeof crypto !== "undefined" && "randomUUID" in crypto) ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
      const safeName = file.name.replace(/[^\w.\-() ]+/g, "_");
      const path = `evodoc/${orgId}/contracts/${contractId}/attachments/${stagePrefix}/${id}_${safeName}`;
      const ref = storageRef(storage, path);

      setUploadingIds((current) => ({ ...current, [id]: 0 }));
      try {
        const task = uploadBytesResumable(ref, file, { contentType: file.type || "application/octet-stream" });
        await new Promise<void>((resolve, reject) => {
          task.on("state_changed", (snapshot) => {
            const progress = snapshot.totalBytes > 0 ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100) : 0;
            setUploadingIds((current) => ({ ...current, [id]: progress }));
          }, reject, () => resolve());
        });

        const downloadUrl = await getDownloadURL(ref);
        const next: AttachmentRef = {
          id,
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
          storagePath: path,
          downloadUrl,
          uploadedAt: new Date().toISOString(),
        };
        onChange([...attachments, next]);
        toast.success(`Attached ${file.name}`);
      } catch (error) {
        toast.error(`Upload failed: ${(error as Error).message}`);
      } finally {
        setUploadingIds((current) => {
          const { [id]: _, ...rest } = current;
          return rest;
        });
      }
    }
  }

  const panel = (
  <>
      <input
        ref={inputRef}
        type="file"
        multiple
        onChange={(event) => {
          const files = event.target.files;
          if (files && files.length > 0) {
            void uploadFiles(files);
          }
          event.target.value = "";
        }}
        hidden
      />

      <div className={hasUploads ? "attachments-panel attachments-panel--filled" : "attachments-panel"}>
        {Object.keys(uploadingIds).length > 0 ? (
          <div className="attachments-empty" style={{ marginBottom: "0.65rem" }}>
            Uploading {Object.keys(uploadingIds).length} file(s)…
          </div>
        ) : null}

        {hasUploads ? (
          <div className="attachments-list">
            {attachments.map((att) => {
              const badge = badgeClassFor(att.mimeType, att.fileName);
              return (
                <div key={att.id} className="attachments-item">
                  <span className={badge.className}>{badge.label}</span>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {att.fileName}
                    </div>
                    <div className="muted-text" style={{ fontSize: "0.78rem" }}>
                      {formatBytes(att.sizeBytes)}
                    </div>
                  </div>

                  <div className="row-actions" style={{ justifyContent: "flex-end" }}>
                    <a
                      href={att.downloadUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="button-secondary"
                      style={{ textDecoration: "none", padding: "6px 10px", borderRadius: 10 }}
                    >
                      Open
                    </a>
                    <button
                      type="button"
                      className="button-secondary"
                      onClick={() => onChange(attachments.filter((x) => x.id !== att.id))}
                      title="Remove"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="attachments-empty">No files attached yet.</div>
        )}
      </div>
  </>
  );

  if (embedded) {
    return <div className="span-all">{panel}</div>;
  }

  return (
    <div className="span-all">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
        <div style={{ fontWeight: 700 }}>{label}</div>
        <div className="row-actions">
          <button type="button" className="button-secondary" onClick={() => inputRef.current?.click()}>
            Add files
          </button>
        </div>
      </div>

      {helperText ? <div className="muted-text" style={{ marginTop: 4 }}>{helperText}</div> : null}
      <div style={{ marginTop: 10 }}>{panel}</div>
    </div>
  );
}

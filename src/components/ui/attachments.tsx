"use client";

import { useMemo, useRef, useState } from "react";
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

function badgeFor(mimeType: string, fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  const key = mimeType.toLowerCase();
  const isPdf = key.includes("pdf") || ext === "pdf";
  const isWord = key.includes("word") || ["doc", "docx"].includes(ext);
  const isExcel = key.includes("spreadsheet") || ["xls", "xlsx", "csv"].includes(ext);
  const isImage = key.startsWith("image/") || ["png", "jpg", "jpeg", "webp"].includes(ext);

  if (isPdf) return { label: "PDF", bg: "rgba(239,68,68,0.14)", border: "rgba(239,68,68,0.55)", fg: "#b91c1c" };
  if (isWord) return { label: "DOC", bg: "rgba(59,130,246,0.14)", border: "rgba(59,130,246,0.55)", fg: "#1d4ed8" };
  if (isExcel) return { label: "XLS", bg: "rgba(34,197,94,0.14)", border: "rgba(34,197,94,0.55)", fg: "#15803d" };
  if (isImage) return { label: "IMG", bg: "rgba(168,85,247,0.14)", border: "rgba(168,85,247,0.55)", fg: "#7e22ce" };
  return { label: "FILE", bg: "rgba(148,163,184,0.18)", border: "rgba(148,163,184,0.65)", fg: "#0f172a" };
}

export function AttachmentsField({
  orgId,
  contractId,
  stage,
  value,
  onChange,
  label = "Attachments",
  helperText,
}: {
  orgId: string;
  contractId: string;
  stage: "contract_sheet" | "shipping_instruction_sheet" | "bank_lc_sheet";
  value: AttachmentRef[];
  onChange: (next: AttachmentRef[]) => void;
  label?: string;
  helperText?: string;
}) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingIds, setUploadingIds] = useState<Record<string, number>>({});

  const attachments = value ?? [];
  const hasUploads = attachments.length > 0;

  const stagePrefix = useMemo(() => {
    if (stage === "contract_sheet") return "contract";
    if (stage === "shipping_instruction_sheet") return "shipping";
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
        style={{ display: "none" }}
      />

      <div
        style={{
          marginTop: 10,
          border: "1px solid rgba(148,163,184,0.7)",
          borderRadius: 14,
          padding: 12,
          background: hasUploads ? "rgba(34,197,94,0.06)" : "rgba(255,255,255,0.65)",
        }}
      >
        {Object.keys(uploadingIds).length > 0 ? (
          <div className="muted-text" style={{ marginBottom: 10 }}>
            Uploading {Object.keys(uploadingIds).length} file(s)…
          </div>
        ) : null}

        {hasUploads ? (
          <div style={{ display: "grid", gap: 8 }}>
            {attachments.map((att) => {
              const badge = badgeFor(att.mimeType, att.fileName);
              return (
                <div
                  key={att.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "auto 1fr auto",
                    gap: 10,
                    alignItems: "center",
                    border: "1px solid rgba(148,163,184,0.55)",
                    borderRadius: 12,
                    padding: "10px 10px",
                    background: "rgba(255,255,255,0.78)",
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      letterSpacing: 0.4,
                      padding: "4px 8px",
                      borderRadius: 999,
                      background: badge.bg,
                      border: `1px solid ${badge.border}`,
                      color: badge.fg,
                      textTransform: "uppercase",
                    }}
                  >
                    {badge.label}
                  </span>

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
          <div className="muted-text">
            No files attached yet.
          </div>
        )}
      </div>
    </div>
  );
}


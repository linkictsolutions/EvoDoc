"use client";

import { useMemo, useRef, useState, type DragEvent } from "react";
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

type UploadingEntry = {
  id: string;
  fileName: string;
  progress: number;
  replaceId?: string;
};

export function AttachmentsField({
  orgId,
  contractId,
  stage,
  value,
  onChange,
  label = "Attachments",
  helperText,
  embedded = false,
}: {
  orgId: string;
  contractId: string;
  stage: "contract_sheet" | "shipping_instruction_sheet" | "bank_lc_sheet" | "bill_of_lading_sheet";
  value: AttachmentRef[];
  onChange: (next: AttachmentRef[]) => void;
  label?: string;
  helperText?: string;
  embedded?: boolean;
}) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState<UploadingEntry[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [replaceTargetId, setReplaceTargetId] = useState<string | null>(null);
  const dragDepthRef = useRef(0);

  const attachments = value ?? [];

  const stagePrefix = useMemo(() => {
    if (stage === "contract_sheet") return "contract";
    if (stage === "shipping_instruction_sheet") return "shipping";
    if (stage === "bill_of_lading_sheet") return "bill-of-lading";
    return "bank-lc";
  }, [stage]);

  async function uploadFiles(files: FileList, replaceId?: string) {
    const storage = getFirebaseStorageClient();
    const list = Array.from(files);
    let nextAttachments = [...attachments];

    for (const file of list) {
      const id = (typeof crypto !== "undefined" && "randomUUID" in crypto)
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;
      const safeName = file.name.replace(/[^\w.\-() ]+/g, "_");
      const path = `evodoc/${orgId}/contracts/${contractId}/attachments/${stagePrefix}/${id}_${safeName}`;
      const ref = storageRef(storage, path);

      setUploading((current) => [...current, { id, fileName: file.name, progress: 0, replaceId }]);

      try {
        const task = uploadBytesResumable(ref, file, { contentType: file.type || "application/octet-stream" });
        await new Promise<void>((resolve, reject) => {
          task.on("state_changed", (snapshot) => {
            const progress = snapshot.totalBytes > 0
              ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
              : 0;
            setUploading((current) => current.map((entry) => (
              entry.id === id ? { ...entry, progress } : entry
            )));
          }, reject, () => resolve());
        });

        const downloadUrl = await getDownloadURL(ref);
        const uploaded: AttachmentRef = {
          id,
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
          storagePath: path,
          downloadUrl,
          uploadedAt: new Date().toISOString(),
        };

        if (replaceId) {
          nextAttachments = [...nextAttachments.filter((item) => item.id !== replaceId), uploaded];
          toast.success(`Replaced with ${file.name}`);
          replaceId = undefined;
        } else {
          nextAttachments = [...nextAttachments, uploaded];
          toast.success(`Attached ${file.name}`);
        }

        onChange(nextAttachments);
      } catch (error) {
        toast.error(`Upload failed: ${(error as Error).message}`);
      } finally {
        setUploading((current) => current.filter((entry) => entry.id !== id));
      }
    }
  }

  function openFilePicker(replaceId?: string) {
    setReplaceTargetId(replaceId ?? null);
    if (replaceId) {
      replaceInputRef.current?.click();
      return;
    }
    inputRef.current?.click();
  }

  function handleSelectedFiles(files: FileList | null, replaceId?: string | null) {
    if (!files || files.length === 0) {
      return;
    }
    void uploadFiles(files, replaceId ?? undefined);
  }

  function handleDragEnter(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    dragDepthRef.current += 1;
    setDragActive(true);
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    dragDepthRef.current -= 1;
    if (dragDepthRef.current <= 0) {
      dragDepthRef.current = 0;
      setDragActive(false);
    }
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    dragDepthRef.current = 0;
    setDragActive(false);
    handleSelectedFiles(event.dataTransfer.files);
  }

  function removeAttachment(id: string) {
    onChange(attachments.filter((item) => item.id !== id));
    toast.info("Attachment removed.");
  }

  const field = (
    <div className="attachments-field">
      <input
        ref={inputRef}
        type="file"
        multiple
        className="attachments-input"
        onChange={(event) => {
          handleSelectedFiles(event.target.files);
          event.target.value = "";
        }}
      />
      <input
        ref={replaceInputRef}
        type="file"
        className="attachments-input"
        onChange={(event) => {
          handleSelectedFiles(event.target.files, replaceTargetId);
          event.target.value = "";
          setReplaceTargetId(null);
        }}
      />

      <div
        className={dragActive ? "attachments-dropzone is-dragging" : "attachments-dropzone"}
        role="button"
        tabIndex={0}
        onClick={() => openFilePicker()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openFilePicker();
          }
        }}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="attachments-dropzone__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M12 16V8m0 0-3 3m3-3 3 3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M5 16.5v1.2A2.3 2.3 0 0 0 7.3 20h9.4A2.3 2.3 0 0 0 19 17.7V16.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          </svg>
        </div>
        <div className="attachments-dropzone__text">
          <strong>Drag and drop files here</strong>
          <span>or <button type="button" className="attachments-dropzone__browse" onClick={(event) => {
            event.stopPropagation();
            openFilePicker();
          }}>click to browse</button></span>
        </div>
        <p className="attachments-dropzone__hint">PDF, Word, Excel, and image files supported</p>
      </div>

      {uploading.length > 0 ? (
        <div className="attachments-list">
          {uploading.map((entry) => (
            <div key={`uploading-${entry.id}`} className="attachments-item attachments-item--uploading">
              <span className="attachments-badge attachments-badge--file">···</span>
              <div className="attachments-item__meta">
                <div className="attachments-item__name">{entry.fileName}</div>
                <div className="attachments-item__progress">
                  <span style={{ width: `${entry.progress}%` }} />
                </div>
                <div className="attachments-item__subtle">
                  {entry.replaceId ? "Replacing…" : "Uploading…"} {entry.progress}%
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {attachments.length > 0 ? (
        <div className="attachments-list">
          {attachments.map((attachment) => {
            const badge = badgeClassFor(attachment.mimeType, attachment.fileName);
            return (
              <div key={attachment.id} className="attachments-item">
                <span className={badge.className}>{badge.label}</span>
                <div className="attachments-item__meta">
                  <div className="attachments-item__name" title={attachment.fileName}>{attachment.fileName}</div>
                  <div className="attachments-item__subtle">{formatBytes(attachment.sizeBytes)}</div>
                </div>
                <div className="attachments-item__actions">
                  <a
                    href={attachment.downloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="attachments-action attachments-action--ghost"
                  >
                    Open
                  </a>
                  <button
                    type="button"
                    className="attachments-action attachments-action--ghost"
                    onClick={() => openFilePicker(attachment.id)}
                  >
                    Replace
                  </button>
                  <button
                    type="button"
                    className="attachments-action attachments-action--danger"
                    onClick={() => removeAttachment(attachment.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : uploading.length === 0 ? (
        <p className="attachments-empty">No files attached yet.</p>
      ) : null}
    </div>
  );

  if (embedded) {
    return <div className="span-all">{field}</div>;
  }

  return (
    <div className="span-all">
      <div className="attachments-field__header">
        <div className="attachments-field__title">{label}</div>
      </div>
      {helperText ? <p className="attachments-field__helper">{helperText}</p> : null}
      {field}
    </div>
  );
}

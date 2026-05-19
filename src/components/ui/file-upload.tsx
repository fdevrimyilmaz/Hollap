"use client";

import { useCallback, useRef, useState, type DragEvent, type ReactNode } from "react";

export type FileUploadAccept = "image" | "video" | "audio" | "document" | "any";

type FileUploadProps = {
  /** Comma-separated accept list, e.g. "image/png,image/jpeg" */
  accept?: string;
  /** Convenience preset; mapped to MIME list. */
  preset?: FileUploadAccept;
  /** Max bytes for the single file. */
  maxBytes?: number;
  /** Multiple file selection. */
  multiple?: boolean;
  /** Label shown above the dropzone. */
  label?: string;
  /** Helper text under the dropzone. */
  hint?: string;
  /** Optional preview slot (image src or custom node). */
  previewSrc?: string | null;
  previewNode?: ReactNode;
  /** Render small instead of full. */
  compact?: boolean;
  /** Fires whenever the user picks valid files. */
  onFiles: (files: File[]) => void;
  /** Fires when the user explicitly removes the preview. */
  onClear?: () => void;
  /** Disable interaction (e.g. while uploading). */
  disabled?: boolean;
  /** Show a busy indicator. */
  isBusy?: boolean;
};

const ACCEPT_PRESETS: Record<FileUploadAccept, string> = {
  image: "image/png,image/jpeg,image/webp,image/gif",
  video: "video/mp4,video/webm,video/quicktime",
  audio: "audio/mpeg,audio/mp4,audio/wav,audio/ogg",
  document: "application/pdf,application/zip",
  any: "image/*,video/*,audio/*,application/pdf,application/zip",
};

const PRESET_LABEL: Record<FileUploadAccept, string> = {
  image: "PNG, JPG, WebP veya GIF",
  video: "MP4, WebM veya MOV",
  audio: "MP3, M4A, WAV veya OGG",
  document: "PDF veya ZIP",
  any: "Görsel, video, ses, PDF veya ZIP",
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function FileUpload({
  accept,
  preset = "any",
  maxBytes,
  multiple = false,
  label,
  hint,
  previewSrc,
  previewNode,
  compact = false,
  onFiles,
  onClear,
  disabled = false,
  isBusy = false,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const acceptString = accept ?? ACCEPT_PRESETS[preset];
  const acceptList = acceptString.split(",").map((s) => s.trim()).filter(Boolean);

  const matchesAccept = useCallback(
    (file: File) => {
      if (acceptList.length === 0) return true;
      return acceptList.some((entry) => {
        if (entry.endsWith("/*")) {
          return file.type.startsWith(entry.slice(0, -1));
        }
        return file.type === entry;
      });
    },
    [acceptList],
  );

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;
      const files = Array.from(fileList);
      setError(null);

      for (const file of files) {
        if (!matchesAccept(file)) {
          setError(`Geçersiz dosya türü: ${file.name}`);
          return;
        }
        if (maxBytes && file.size > maxBytes) {
          setError(`${file.name} çok büyük. Maks ${formatBytes(maxBytes)}.`);
          return;
        }
      }

      onFiles(multiple ? files : [files[0]]);
    },
    [matchesAccept, maxBytes, multiple, onFiles],
  );

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (disabled || isBusy) return;
    handleFiles(event.dataTransfer.files);
  };

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (disabled || isBusy) return;
    setIsDragging(true);
  };

  const onDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const openPicker = () => {
    if (disabled || isBusy) return;
    inputRef.current?.click();
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-white">{label}</label>
      )}

      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={openPicker}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openPicker();
          }
        }}
        className={`relative rounded-2xl border-2 border-dashed transition-all ${
          compact ? "p-4" : "p-6 sm:p-8"
        } ${
          isDragging
            ? "border-orange-500 bg-orange-500/10"
            : disabled || isBusy
              ? "border-white/10 bg-white/[0.02] cursor-not-allowed opacity-60"
              : "border-white/15 bg-white/[0.02] hover:border-white/30 hover:bg-white/[0.04] cursor-pointer"
        } ${error ? "border-red-500/40 bg-red-500/5" : ""}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={acceptString}
          multiple={multiple}
          disabled={disabled || isBusy}
          onChange={(event) => handleFiles(event.target.files)}
          onClick={(event) => {
            // allow re-selecting the same file
            (event.target as HTMLInputElement).value = "";
          }}
          className="sr-only"
        />

        {previewSrc || previewNode ? (
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl overflow-hidden bg-white/5 ring-1 ring-white/10 shrink-0 relative">
              {previewSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewSrc} alt="Önizleme" className="w-full h-full object-cover" />
              ) : (
                previewNode
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white font-medium">Dosya yüklendi</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Değiştirmek için tıkla veya yeni dosya bırak.
              </p>
            </div>
            {onClear && !isBusy && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onClear();
                  setError(null);
                }}
                className="p-2 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/5 transition-colors shrink-0"
                aria-label="Kaldır"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M7 7V5a2 2 0 012-2h6a2 2 0 012 2v2" />
                </svg>
              </button>
            )}
          </div>
        ) : (
          <div className="text-center">
            <div className={`mx-auto mb-3 rounded-2xl bg-orange-500/10 flex items-center justify-center ${
              compact ? "w-10 h-10" : "w-12 h-12"
            }`}>
              {isBusy ? (
                <svg className={`animate-spin text-orange-400 ${compact ? "w-4 h-4" : "w-5 h-5"}`} viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                  <path fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
                </svg>
              ) : (
                <svg className={`text-orange-400 ${compact ? "w-5 h-5" : "w-6 h-6"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 0115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              )}
            </div>
            <p className={`font-medium text-white ${compact ? "text-sm" : "text-base"}`}>
              {isBusy ? "Yükleniyor…" : isDragging ? "Şimdi bırak" : "Dosya seç veya buraya sürükle"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {hint ?? `${PRESET_LABEL[preset]}${maxBytes ? ` · maks ${formatBytes(maxBytes)}` : ""}`}
            </p>
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-400 flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}

"use client";

import { useRef, useState } from "react";
import { useMediaMaxFileSize } from "@/hooks/media-max-file-size";
import { STATUS_UNAUTHORIZED, STATUS_PAYLOAD_TOO_LARGE } from "@/lib/http-status";

interface UploadResult {
  url: string;
  type?: "image" | "video";
}

interface FileUploadProps {
  onUpload: (result: UploadResult) => void;
  accept?: string;
  label?: string;
  size?: "sm" | "md";
}

export function FileUpload({ onUpload, accept, label, size = "md" }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { maxBytes, refreshMaxBytes } = useMediaMaxFileSize();

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || uploading) return;

    if (maxBytes !== null && file.size > maxBytes) {
      const maxMb = Math.round(maxBytes / (1024 * 1024));
      setError(`File exceeds ${maxMb} MB limit.`);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      // Session expired — redirect to login to re-authenticate
      if (res.status === STATUS_UNAUTHORIZED) { window.location.href = "/login"; return; }

      // Server rejected the file as too large — our cached limit is stale, so refresh it
      // so the next upload attempt uses the corrected value without another round-trip
      if (res.status === STATUS_PAYLOAD_TOO_LARGE) { void refreshMaxBytes(); }

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Upload failed.");
        return;
      }

      onUpload(data.data);
    } catch {
      setError("Upload failed.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const inputId = `file-upload-${(label || "input").replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <>
      <input ref={inputRef} id={inputId} type="file" accept={accept} onChange={handleChange} className="sr-only" />
      <button type="button" className={`btn btn-ghost${size === "sm" ? " btn-sm" : ""}`} onClick={() => inputRef.current?.click()}>
        {uploading ? "Uploading..." : (label || "Upload")}
      </button>
      {error && <span className="text-error text-xs" role="alert">{error}</span>}
    </>
  );
}

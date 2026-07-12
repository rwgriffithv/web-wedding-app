"use client";

import { useRef, useState } from "react";

interface UploadResult {
  url: string;
  type?: "image" | "video";
}

interface FileUploadProps {
  onUpload: (result: UploadResult) => void;
  accept?: string;
  label?: string;
}

export function FileUpload({ onUpload, accept, label }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Upload failed.");
        return;
      }

      onUpload(data);
    } catch {
      setError("Upload failed.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
      <input ref={inputRef} type="file" accept={accept} onChange={handleChange} className="sr-only" />
      <button type="button" className="btn btn-ghost" onClick={() => inputRef.current?.click()} disabled={uploading}>
        {uploading ? "Uploading..." : (label || "Upload")}
      </button>
      {error && <span className="text-error text-xs" role="alert">{error}</span>}
    </div>
  );
}

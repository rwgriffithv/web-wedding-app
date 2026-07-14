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
  size?: "sm" | "md";
}

export function FileUpload({ onUpload, accept, label, size = "md" }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || uploading) return;

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

  const inputId = `file-upload-${label?.replace(/\s+/g, "-").toLowerCase() ?? "input"}`;

  return (
    <div className="flex-row items-center gap-2">
      <input ref={inputRef} id={inputId} type="file" accept={accept} onChange={handleChange} className="sr-only" />
      <label htmlFor={inputId} className={`btn btn-ghost${size === "sm" ? " btn-sm" : ""}`} onClick={() => inputRef.current?.click()}>
        {uploading ? "Uploading..." : (label || "Upload")}
      </label>
      {error && <span className="text-error text-xs" role="alert">{error}</span>}
    </div>
  );
}

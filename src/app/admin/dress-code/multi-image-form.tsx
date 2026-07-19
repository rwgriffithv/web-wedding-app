"use client";

import { useRef, useState, useActionState, useEffect } from "react";
import { addImage } from "./actions";
import { FileBrowser } from "@/components/file-browser";
import { getMaxFileSizeBytes } from "@/lib/media-config";

const initialState: { success?: boolean; error?: string } | null = null;

function fileName(url: string): string {
  try {
    const parsed = new URL(url, window.location.origin);
    const segments = parsed.pathname.split("/");
    return segments[segments.length - 1] || url;
  } catch {
    const segments = url.split("/");
    const last = segments[segments.length - 1] || url;
    const qIndex = last.indexOf("?");
    const hIndex = last.indexOf("#");
    const end = Math.min(qIndex === -1 ? last.length : qIndex, hIndex === -1 ? last.length : hIndex);
    return last.slice(0, end) || url;
  }
}

export function DressCodeMultiImageForm() {
  const [state, dispatch, isPending] = useActionState(addImage, initialState);
  const [queue, setQueue] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showBrowser, setShowBrowser] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) setQueue([]);
  }, [state?.success]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0 || uploading) return;
    setUploading(true);
    setUploadErrors([]);

    const maxBytes = getMaxFileSizeBytes();

    const failures: string[] = [];
    for (const file of Array.from(files)) {
      if (file.size > maxBytes) {
        failures.push(file.name);
        continue;
      }
      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/upload", { method: "POST", body: formData });
        if (res.status === 401) { window.location.href = "/login"; return; }
        if (!res.ok) { failures.push(file.name); continue; }

        let data: { data?: { url?: string } };
        try {
          data = await res.json();
        } catch {
          failures.push(file.name);
          continue;
        }

        if (data.data?.url) {
          setQueue(prev => [...prev, data.data!.url!]);
        } else {
          failures.push(file.name);
        }
      } catch {
        failures.push(file.name);
      }
    }

    if (failures.length > 0) {
      setUploadErrors(prev => [...prev, `Failed to upload: ${failures.join(", ")}`]);
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleBrowseSelect = (url: string) => {
    setQueue(prev => [...prev, url]);
    setShowBrowser(false);
  };

  const handleSubmit = () => {
    if (!formRef.current || queue.length === 0) return;
    const fd = new FormData(formRef.current);
    for (const url of queue) {
      fd.append("image_url", url);
    }
    setUploadErrors([]);
    dispatch(fd);
  };

  return (
    <>
      {showBrowser && (
        <FileBrowser
          onSelect={handleBrowseSelect}
          onClose={() => setShowBrowser(false)}
        />
      )}
      <form ref={formRef} className="styled-form" onSubmit={e => e.preventDefault()}>
        <input ref={inputRef} type="file" accept="image/*" multiple className="sr-only" onChange={e => handleFiles(e.target.files)} />

        {state?.success && <p className="text-success text-sm mb-1" role="status">Image(s) added.</p>}

        <div className="flex-row items-center gap-1">
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => inputRef.current?.click()} disabled={uploading}>
            {uploading ? "Uploading..." : "Upload"}
          </button>
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => setShowBrowser(true)} disabled={uploading}>
            Local
          </button>
        </div>

        {queue.length > 0 && (
          <ul className="mt-1 text-sm" style={{ listStyle: "none", padding: 0 }}>
            {queue.map((url, i) => (
              <li key={`${url}-${i}`} className="flex-row items-center gap-1" style={{ minHeight: 28 }}>
                <span className="flex-1 truncate text-muted" title={url}>{fileName(url)}</span>
                <button type="button" className="btn btn-sm btn-ghost text-error" onClick={() => setQueue(prev => prev.filter((_, j) => j !== i))} aria-label={`Remove ${fileName(url)}`}>
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}

        {uploadErrors.length > 0 && (
          <div className="mt-1">
            {uploadErrors.map((err, i) => (
              <p key={i} className="text-error text-sm" role="alert">{err}</p>
            ))}
          </div>
        )}

        {state?.error && <p className="text-error text-sm mt-1" role="alert">{state.error}</p>}

        <div className="flex-row items-center gap-1 mt-1">
          <button type="button" className="btn btn-primary" disabled={isPending || queue.length === 0} onClick={handleSubmit}>
            {isPending ? "Adding..." : `Add ${queue.length > 0 ? queue.length : ""} Image${queue.length !== 1 ? "s" : ""}`}
          </button>
          <button type="button" className="btn btn-ghost text-error" disabled={queue.length === 0} onClick={() => setQueue([])}>
            Clear
          </button>
        </div>
      </form>
    </>
  );
}

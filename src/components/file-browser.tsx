"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface FileBrowserProps {
  onSelect: (url: string) => void;
  onClose: () => void;
}

interface Listing {
  path: string;
  dirs: string[];
  files: string[];
}

function joinPath(base: string, name: string): string {
  return base ? `${base}/${name}` : name;
}

export function FileBrowser({ onSelect, onClose }: FileBrowserProps) {
  const [currentPath, setCurrentPath] = useState("");
  const [listing, setListing] = useState<Listing>({ path: "", dirs: [], files: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchListing = useCallback((dirPath: string) => {
    setLoading(true);
    setError(null);
    const qs = dirPath ? `?path=${encodeURIComponent(dirPath)}` : "";
    fetch(`/api/media/list${qs}`)
      .then(r => {
        if (!r.ok) throw new Error("Failed to load files.");
        return r.json();
      })
      .then(data => {
        setListing(data);
        setCurrentPath(data.path ?? "");
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load files.");
        setLoading(false);
      });
  }, []);

  useEffect(() => { fetchListing(""); }, [fetchListing]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "Tab") {
        const dialog = containerRef.current;
        if (!dialog) return;
        const focusable = dialog.querySelectorAll<HTMLElement>("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])");
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) { e.preventDefault(); last.focus(); }
        } else {
          if (document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const breadcrumbs = currentPath
    ? currentPath.split("/").map((seg, i, arr) => ({
        label: seg,
        path: arr.slice(0, i + 1).join("/"),
      }))
    : [];

  return (
    <div className="file-browser-overlay" ref={containerRef} onClick={onClose} role="dialog" aria-modal="true" aria-label="Browse local media files">
      <div className="file-browser-content" onClick={e => e.stopPropagation()}>
        <div className="file-browser-header">
          <h3>Browse Local Files</h3>
          <button type="button" className="btn btn-sm btn-ghost" onClick={onClose} aria-label="Close">&times;</button>
        </div>
        <div className="file-browser-body">
          <nav className="file-browser-breadcrumb" aria-label="Directory navigation">
            <button type="button" className="file-browser-breadcrumb-link" onClick={() => fetchListing("")}>media</button>
            {breadcrumbs.map(b => (
              <span key={b.path}>
                <span className="file-browser-breadcrumb-sep">/</span>
                <button type="button" className="file-browser-breadcrumb-link" onClick={() => fetchListing(b.path)}>{b.label}</button>
              </span>
            ))}
          </nav>
          {loading && <p className="text-muted text-sm">Loading...</p>}
          {error && <p className="text-error text-sm">{error}</p>}
          {!loading && !error && listing.dirs.length === 0 && listing.files.length === 0 && (
            <p className="text-muted text-sm">Empty directory.</p>
          )}
          <div className="file-browser-list">
            {listing.dirs.map(name => (
              <button
                key={`dir:${name}`}
                type="button"
                className="file-browser-item file-browser-dir"
                onClick={() => fetchListing(joinPath(currentPath, name))}
              >
                <span className="file-browser-icon" aria-hidden="true">📁</span>
                <span className="file-browser-name">{name}/</span>
              </button>
            ))}
            {listing.files.map(name => (
              <button
                key={`file:${name}`}
                type="button"
                className="file-browser-item"
                onClick={() => { onSelect(`/api/media/${joinPath(currentPath, name)}`); onClose(); }}
              >
                <span className="file-browser-icon" aria-hidden="true">📄</span>
                <span className="file-browser-name">{name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

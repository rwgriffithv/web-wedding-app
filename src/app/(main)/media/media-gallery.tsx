"use client";

import Image from "next/image";
import { useState, useEffect, useCallback } from "react";
import type { MediaItem } from "@/lib/db";

interface MediaGalleryProps {
  items: MediaItem[];
}

export function MediaGallery({ items }: MediaGalleryProps) {
  const [selected, setSelected] = useState<MediaItem | null>(null);

  const close = useCallback(() => setSelected(null), []);

  useEffect(() => {
    if (!selected) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selected, close]);

  return (
    <>
      <div className="media-gallery">
        {items.map((item) => (
          <div
            className="media-item"
            key={item.id}
            onClick={() => setSelected(item)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setSelected(item);
              }
            }}
            role="button"
            tabIndex={0}
          >
            {item.type === "video" ? (
              <video src={item.thumbnail_url || item.url} muted controls />
            ) : (
              <Image src={item.thumbnail_url || item.url} alt={item.title || ""} fill style={{ objectFit: "cover" }} />
            )}
            {item.title && <div className="media-item-overlay">{item.title}</div>}
          </div>
        ))}
      </div>

      {selected && (
        <div
          className="lightbox-overlay"
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-label={selected.title || "Media lightbox"}
        >
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            {selected.type === "video" ? (
              <video src={selected.url} controls autoPlay muted />
            ) : (
              <Image src={selected.url} alt={selected.title || ""} fill style={{ maxWidth: "100%", maxHeight: "90vh", objectFit: "contain" }} />
            )}
          </div>
          <button className="lightbox-close" onClick={close} aria-label="Close lightbox">
            &times;
          </button>
        </div>
      )}
    </>
  );
}

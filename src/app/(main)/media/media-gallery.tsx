"use client";

import Image from "next/image";
import { useState, useEffect, useCallback, useRef } from "react";
import type { MediaItem } from "@/lib/db";

interface MediaGalleryProps {
  items: MediaItem[];
}

export function MediaGallery({ items }: MediaGalleryProps) {
  const [selected, setSelected] = useState<MediaItem | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const lastTriggerRef = useRef<HTMLElement | null>(null);

  const close = useCallback(() => {
    setSelected(null);
    lastTriggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!selected) return;
    const overlay = overlayRef.current;
    overlay?.focus();

    document.body.style.overflow = "hidden";

    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
        return;
      }
      if (e.key === "Tab" && overlay) {
        const focusable = overlay.querySelectorAll<HTMLElement>("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])");
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
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [selected, close]);

  const openItem = (item: MediaItem, trigger: HTMLElement) => {
    lastTriggerRef.current = trigger;
    setSelected(item);
  };

  return (
    <>
      <div className="media-gallery">
        {items.map((item) => (
          <div
            className="media-item"
            key={item.id}
            onClick={(e) => openItem(item, e.currentTarget)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openItem(item, e.currentTarget);
              }
            }}
            role="button"
            tabIndex={0}
          >
            {item.type === "video" ? (
              item.thumbnail_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.thumbnail_url} alt={item.title || "Video thumbnail"} />
              ) : (
                <video src={item.url} muted preload="metadata" aria-label={item.title || "Video"} />
              )
            ) : (
              <Image src={item.thumbnail_url || item.url} alt={item.title || "Media item"} fill style={{ objectFit: "cover" }} />
            )}
            {item.type === "video" && <span className="play-icon" aria-hidden="true">&#9654;</span>}
            {item.title && <div className="media-item-caption">{item.title}</div>}
          </div>
        ))}
      </div>

      {selected && (
        <div
          ref={overlayRef}
          className="lightbox-overlay"
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-label={selected.title || "Media lightbox"}
          tabIndex={-1}
        >
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            {selected.type === "video" ? (
              <video src={selected.url} controls autoPlay muted />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={selected.url} alt={selected.title || "Media item"} />
            )}
            {selected.title && <div className="lightbox-caption">{selected.title}</div>}
          </div>
          <button className="lightbox-close" onClick={close} aria-label="Close lightbox">
            &times;
          </button>
        </div>
      )}
    </>
  );
}

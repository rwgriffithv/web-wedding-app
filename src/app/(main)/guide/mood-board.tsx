"use client";

import Image from "next/image";
import { useState, useEffect, useCallback, useRef } from "react";
import type { DressCodeImage } from "@/lib/db";

interface MoodBoardProps {
  images: DressCodeImage[];
}

export function MoodBoard({ images }: MoodBoardProps) {
  const [selected, setSelected] = useState<DressCodeImage | null>(null);
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

  const openItem = (img: DressCodeImage, trigger: HTMLElement) => {
    lastTriggerRef.current = trigger;
    setSelected(img);
  };

  return (
    <>
      <div className="mood-board">
        {images.map((img) => (
          <div
            className="mood-board-item"
            key={img.id}
            onClick={(e) => openItem(img, e.currentTarget)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openItem(img, e.currentTarget);
              }
            }}
            role="button"
            tabIndex={0}
          >
            <Image
              src={img.thumbnail_url || img.image_url}
              alt="Dress code inspiration"
              fill
              style={{ objectFit: "cover", borderRadius: "var(--radius)" }}
            />
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
          aria-label="Dress code image"
          tabIndex={-1}
        >
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <img src={selected.image_url} alt="Dress code inspiration" />
          </div>
          <button className="lightbox-close" onClick={close} aria-label="Close lightbox">
            &times;
          </button>
        </div>
      )}
    </>
  );
}

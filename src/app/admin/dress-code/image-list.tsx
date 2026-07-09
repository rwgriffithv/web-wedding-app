"use client";

import Image from "next/image";
import { useActionState } from "react";
import { deleteImage } from "./actions";
import type { DressCodeImage } from "@/lib/db";

interface ImageListProps {
  images: DressCodeImage[];
}

const initialState = null;

export function DressCodeImageList({ images }: ImageListProps) {
  const [, dispatch, isPending] = useActionState(deleteImage, initialState);

  return (
    <div className="admin-list">
      {images.map((img) => (
        <div className="admin-list-item" key={img.id}>
          <div className="item-info" style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <Image src={img.image_url} alt={img.image_url} width={80} height={60} style={{ objectFit: "cover", borderRadius: "4px" }} />
            <span className="item-meta">{img.image_url}</span>
          </div>
          <div className="item-actions">
            <form action={dispatch} onSubmit={(e) => { if (!confirm("Remove this image?")) e.preventDefault(); }}>
              <input type="hidden" name="image_id" value={img.id} />
              <button type="submit" className="btn btn-sm btn-danger" disabled={isPending}>{isPending ? "Removing..." : "Remove"}</button>
            </form>
          </div>
        </div>
      ))}
      {images.length === 0 && (
        <p style={{ color: "var(--color-muted)", fontStyle: "italic" }}>No mood board images yet.</p>
      )}
    </div>
  );
}

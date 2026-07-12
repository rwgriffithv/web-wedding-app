"use client";

import Image from "next/image";
import { useActionState } from "react";
import { deleteImage, moveImage } from "./actions";
import type { DressCodeImage } from "@/lib/db";

interface ImageListProps {
  images: DressCodeImage[];
}

function ImageListItem({ img, index, total }: { img: DressCodeImage; index: number; total: number }) {
  const [delState, delDispatch, delPending] = useActionState(deleteImage, null);
  const [moveState, moveDispatch, movePending] = useActionState(moveImage, null);

  return (
    <div className="admin-list-item">
      <div className="item-info flex-row items-center gap-2">
        <Image src={img.thumbnail_url || img.image_url} alt="Dress code reference image" width={80} height={60} style={{ objectFit: "cover", borderRadius: "4px" }} />
        <span className="item-meta">{img.image_url}</span>
      </div>
      <div className="item-actions">
        <form action={moveDispatch} className="inline-flex">
          <input type="hidden" name="image_id" value={img.id} />
          <input type="hidden" name="direction" value="up" />
          <button type="submit" className="btn btn-sm btn-ghost" disabled={movePending || index === 0} title="Move up">&#9650;</button>
        </form>
        <form action={moveDispatch} className="inline-flex">
          <input type="hidden" name="image_id" value={img.id} />
          <input type="hidden" name="direction" value="down" />
          <button type="submit" className="btn btn-sm btn-ghost" disabled={movePending || index === total - 1} title="Move down">&#9660;</button>
        </form>
        <form action={delDispatch} onSubmit={(e) => { if (!confirm("Remove this image?")) e.preventDefault(); }}>
          <input type="hidden" name="image_id" value={img.id} />
          <button type="submit" className="btn btn-sm btn-danger" disabled={delPending}>{delPending ? "Removing..." : "Remove"}</button>
        </form>
        {moveState?.error && <span className="table-error">{moveState.error}</span>}
        {delState?.error && <span className="table-error">{delState.error}</span>}
      </div>
    </div>
  );
}

export function DressCodeImageList({ images }: ImageListProps) {
  return (
    <div className="admin-list">
      {images.map((img, index) => (
        <ImageListItem img={img} index={index} total={images.length} key={img.id} />
      ))}
      {images.length === 0 && (
        <p className="empty-state">No mood board images yet.</p>
      )}
    </div>
  );
}

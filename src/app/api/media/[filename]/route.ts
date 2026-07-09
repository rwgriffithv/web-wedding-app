import { NextResponse } from "next/server";
import { MEDIA_DIR } from "@/lib/media";
import fs from "node:fs/promises";
import path from "node:path";

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;

  const safe = path.basename(filename);
  if (safe !== filename) {
    return NextResponse.json({ error: "Invalid path." }, { status: 400 });
  }

  const filepath = path.join(MEDIA_DIR, safe);
  const ext = path.extname(safe).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";

  let buffer: Buffer;
  try {
    buffer = await fs.readFile(filepath);
  } catch {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  return new NextResponse(buffer.buffer as ArrayBuffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

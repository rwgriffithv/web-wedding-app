import { NextResponse } from "next/server";
import { getConfig } from "@/lib/repository/site-config";
import { MEDIA_DIR, IMAGE_EXTENSIONS, isWithinMediaDir, MIME_TYPES } from "@/lib/media";
import fs from "node:fs";
import path from "node:path";

export async function GET() {
  const background = getConfig("landing_background");
  if (!background || !background.startsWith("/api/media/")) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const mediaPath = background.slice("/api/media/".length);
  const resolved = path.resolve(MEDIA_DIR, mediaPath);

  if (!isWithinMediaDir(resolved)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const ext = path.extname(resolved).toLowerCase();
  if (!IMAGE_EXTENSIONS.has(ext) || !MIME_TYPES[ext]) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const contentType = MIME_TYPES[ext];

  let buffer: Buffer;
  try {
    buffer = await fs.promises.readFile(resolved);
  } catch (error) {
    console.error("Failed to read background image:", error);
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  return new NextResponse(buffer.buffer as ArrayBuffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=300",
    },
  });
}

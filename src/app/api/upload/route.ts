import { NextResponse } from "next/server";
import { requireAdminSessionOrNull, validateSessionInDb } from "@/lib/auth";
import { MEDIA_DIR, ensureMediaDir, ALLOWED_EXTENSIONS, IMAGE_EXTENSIONS, VIDEO_EXTENSIONS } from "@/lib/media";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

export async function POST(request: Request) {
  const session = await requireAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await validateSessionInDb(session))) {
    return NextResponse.json({ error: "Session expired" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  const ext = path.extname(file.name).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return NextResponse.json({ error: `File type "${ext}" is not allowed.` }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File exceeds 50 MB limit." }, { status: 413 });
  }

  ensureMediaDir();

  const uuid = randomUUID();
  const filename = `${uuid}${ext}`;
  const filepath = path.join(MEDIA_DIR, filename);
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    await fs.promises.writeFile(filepath, buffer);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to save file." }, { status: 500 });
  }

  // SVG excluded from isImage to prevent thumbnail generation (sharp cannot rasterize SVG).
  // SVG is still typed as "image" in the database for gallery display.
  const isImage = IMAGE_EXTENSIONS.has(ext) && ext !== ".svg";
  const isVideo = VIDEO_EXTENSIONS.has(ext);
  const type = isImage ? "image" : isVideo ? "video" : "image";

  return NextResponse.json({
    url: `/api/media/${filename}`,
    type,
  });
}

import { NextResponse } from "next/server";
import { requireSession, validateSessionInDb } from "@/lib/auth";
import { MEDIA_DIR, ensureMediaDir, ALLOWED_EXTENSIONS, IMAGE_EXTENSIONS } from "@/lib/media";
import { getConfig } from "@/lib/repository/site-config";
import { MEDIA_MAX_FILE_SIZE_MB_DEFAULT } from "@/lib/constants";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import { Readable } from "node:stream";
import path from "node:path";
import { pipeline } from "node:stream/promises";

export async function POST(request: Request) {
  const session = await requireSession("admin");
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!(await validateSessionInDb(session))) {
    return NextResponse.json({ success: false, error: "Session expired" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ success: false, error: "No file provided." }, { status: 400 });
  }

  const ext = path.extname(file.name).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return NextResponse.json({ success: false, error: `File type "${ext}" is not allowed.` }, { status: 400 });
  }

  const maxSizeMb = parseInt(getConfig("media_max_file_size_mb"), 10);
  const maxSizeBytes = (Number.isFinite(maxSizeMb) && maxSizeMb > 0 ? maxSizeMb : MEDIA_MAX_FILE_SIZE_MB_DEFAULT) * 1024 * 1024;

  if (file.size > maxSizeBytes) {
    return NextResponse.json({ success: false, error: "File exceeds size limit." }, { status: 413 });
  }

  ensureMediaDir();

  const uuid = randomUUID();
  const filename = `${uuid}${ext}`;
  const filepath = path.join(MEDIA_DIR, filename);

  try {
    const nodeStream = Readable.fromWeb(file.stream() as import("stream/web").ReadableStream);
    const writeStream = fs.createWriteStream(filepath);
    await pipeline(nodeStream, writeStream);
  } catch (error) {
    console.error(error);
    // Clean up partial file on failure
    await fs.promises.unlink(filepath).catch(() => {});
    return NextResponse.json({ success: false, error: "Failed to save file." }, { status: 500 });
  }

  // All allowed image extensions generate thumbnails.
  const isImage = IMAGE_EXTENSIONS.has(ext);
  const type = isImage ? "image" : "video";

  return NextResponse.json({
    success: true,
    data: {
      url: `/api/media/${filename}`,
      type,
    },
  });
}

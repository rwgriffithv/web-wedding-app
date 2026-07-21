import { NextResponse } from "next/server";
import { requireSession, validateSessionInDb } from "@/lib/auth";
import { MEDIA_DIR, ensureMediaDir, ALLOWED_EXTENSIONS, IMAGE_EXTENSIONS } from "@/lib/media";
import { logError } from "@/lib/logger";
import { getMediaMaxFileSizeMb } from "@/lib/site-config";
import { STATUS_UNAUTHORIZED } from "@/lib/http-status";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import { Readable } from "node:stream";
import path from "node:path";
import { pipeline } from "node:stream/promises";

export async function POST(request: Request) {
  const session = await requireSession("admin");
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: STATUS_UNAUTHORIZED });
  }
  if (!(await validateSessionInDb(session))) {
    return NextResponse.json({ success: false, error: "Session expired" }, { status: STATUS_UNAUTHORIZED });
  }

  const maxSizeMb = getMediaMaxFileSizeMb();
  const maxSizeBytes = maxSizeMb * 1024 * 1024;

  // Early content-length guard — reject oversized uploads before buffering
  // the entire multipart body. Multipart boundaries and headers add ~few
  // hundred bytes on top of the file size; a 4 KB overhead allowance is
  // generous enough to never miscategorize a valid request.
  const contentLength = parseInt(request.headers.get("content-length") || "0", 10);
  if (contentLength > maxSizeBytes + 4096) {
    return NextResponse.json({ success: false, error: `File exceeds ${maxSizeMb} MB limit.`, maxFileSizeMb: maxSizeMb }, { status: 413 });
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

  if (file.size > maxSizeBytes) {
    return NextResponse.json({ success: false, error: `File exceeds ${maxSizeMb} MB limit.`, maxFileSizeMb: maxSizeMb }, { status: 413 });
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
    logError("Upload", error);
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

import { NextResponse } from "next/server";
import { requireSession, validateSessionInDb } from "@/lib/auth";
import { MEDIA_DIR, ALLOWED_EXTENSIONS, isWithinMediaDir, MIME_TYPES } from "@/lib/media";
import { logError } from "@/lib/logger";
import fs from "node:fs";
import path from "node:path";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!(await validateSessionInDb(session))) {
    return NextResponse.json({ success: false, error: "Session expired" }, { status: 401 });
  }

  const { path: segments } = await params;

  const joined = path.join(...segments);
  const resolved = path.resolve(MEDIA_DIR, joined);

  if (!isWithinMediaDir(resolved)) {
    return NextResponse.json({ success: false, error: "Invalid path." }, { status: 400 });
  }

  const ext = path.extname(resolved).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return NextResponse.json({ success: false, error: "Not found." }, { status: 404 });
  }

  let stat: fs.Stats;
  try {
    stat = await fs.promises.stat(resolved);
  } catch (error) {
    logError("MediaServe", error);
    return NextResponse.json({ success: false, error: "Not found." }, { status: 404 });
  }

  const contentType = MIME_TYPES[ext] || "application/octet-stream";
  const readStream = fs.createReadStream(resolved);

  return new Response(readStream as unknown as ReadableStream, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(stat.size),
      "Cache-Control": "private, max-age=86400, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

import { NextResponse } from "next/server";
import { requireSession, validateSessionInDb } from "@/lib/auth";
import { MEDIA_DIR, ALLOWED_EXTENSIONS, isWithinMediaDir, MIME_TYPES } from "@/lib/media";
import { logError } from "@/lib/logger";
import { createRateLimiter, getRateLimitConfig } from "@/lib/rate-limit";
import { parseClientIp } from "@/lib/ip";
import { MEDIA_RATE_LIMIT_MAX_KEY, MEDIA_RATE_LIMIT_WINDOW_SECONDS_KEY, MEDIA_RATE_LIMIT_MAX_DEFAULT, MEDIA_RATE_LIMIT_WINDOW_SECONDS_DEFAULT } from "@/lib/constants";
import { STATUS_UNAUTHORIZED, STATUS_TOO_MANY_REQUESTS } from "@/lib/http-status";
import fs from "node:fs";
import path from "node:path";

const mediaRateLimiter = createRateLimiter("media");

function getMediaRateLimitConfig() {
  return getRateLimitConfig(MEDIA_RATE_LIMIT_MAX_KEY, MEDIA_RATE_LIMIT_WINDOW_SECONDS_KEY, MEDIA_RATE_LIMIT_MAX_DEFAULT, MEDIA_RATE_LIMIT_WINDOW_SECONDS_DEFAULT);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: STATUS_UNAUTHORIZED });
  }
  if (!(await validateSessionInDb(session))) {
    return NextResponse.json({ success: false, error: "Session expired" }, { status: STATUS_UNAUTHORIZED });
  }

  const ip = parseClientIp(request.headers);
  const rlConfig = getMediaRateLimitConfig();
  const rlResult = mediaRateLimiter.check(`${ip}:media`, rlConfig);
  if (!rlResult.allowed) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Please wait before trying again." },
      { status: STATUS_TOO_MANY_REQUESTS, headers: { "Retry-After": String(Math.ceil(rlResult.retryAfterMs / 1000)) } },
    );
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

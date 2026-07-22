import { NextResponse } from "next/server";
import { requireSession, validateSessionInDb } from "@/lib/auth";
import { MEDIA_DIR, ALLOWED_EXTENSIONS, isWithinMediaDir } from "@/lib/media";
import { logError } from "@/lib/logger";
import { createRateLimiter, getRateLimitConfig } from "@/lib/rate-limit";
import { parseClientIp } from "@/lib/ip";
import { MEDIA_RATE_LIMIT_MAX_KEY, MEDIA_RATE_LIMIT_WINDOW_SECONDS_KEY, MEDIA_RATE_LIMIT_MAX_DEFAULT, MEDIA_RATE_LIMIT_WINDOW_SECONDS_DEFAULT } from "@/lib/constants";
import { STATUS_UNAUTHORIZED, STATUS_TOO_MANY_REQUESTS } from "@/lib/http-status";
import fs from "node:fs";
import path from "node:path";

const mediaListRateLimiter = createRateLimiter("media_list");

function getMediaListRateLimitConfig() {
  return getRateLimitConfig(MEDIA_RATE_LIMIT_MAX_KEY, MEDIA_RATE_LIMIT_WINDOW_SECONDS_KEY, MEDIA_RATE_LIMIT_MAX_DEFAULT, MEDIA_RATE_LIMIT_WINDOW_SECONDS_DEFAULT);
}

export async function GET(request: Request) {
  const session = await requireSession("admin");
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: STATUS_UNAUTHORIZED });
  }
  if (!(await validateSessionInDb(session))) {
    return NextResponse.json({ success: false, error: "Session expired" }, { status: STATUS_UNAUTHORIZED });
  }

  const ip = parseClientIp(request.headers);
  const rlConfig = getMediaListRateLimitConfig();
  const rlResult = mediaListRateLimiter.check(`${ip}:media_list`, rlConfig);
  if (!rlResult.allowed) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Please wait before trying again." },
      { status: STATUS_TOO_MANY_REQUESTS, headers: { "Retry-After": String(Math.ceil(rlResult.retryAfterMs / 1000)) } },
    );
  }

  const { searchParams } = new URL(request.url);
  const subpath = searchParams.get("path") ?? "";

  const resolved = path.resolve(MEDIA_DIR, subpath);
  if (!isWithinMediaDir(resolved)) {
    return NextResponse.json({ success: false, error: "Invalid path." }, { status: 400 });
  }

  let entries: fs.Dirent[];
  try {
    entries = await fs.promises.readdir(resolved, { withFileTypes: true }) as fs.Dirent[];
  } catch (error) {
    logError("MediaList", error);
    return NextResponse.json({ success: false, error: "Failed to read directory." }, { status: 500 });
  }

  const dirs = entries
    .filter(e => e.isDirectory())
    .map(e => e.name)
    .sort();

  const files = entries
    .filter(e => e.isFile() && ALLOWED_EXTENSIONS.has(path.extname(e.name).toLowerCase()))
    .map(e => e.name)
    .sort();

  return NextResponse.json({ success: true, data: { path: subpath, dirs, files } });
}

import { NextResponse } from "next/server";
import { requireAdminSessionOrNull, validateSessionInDb } from "@/lib/auth";
import { MEDIA_DIR, ALLOWED_EXTENSIONS, isWithinMediaDir } from "@/lib/media";
import fs from "node:fs";
import path from "node:path";

export async function GET(request: Request) {
  const session = await requireAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await validateSessionInDb(session))) {
    return NextResponse.json({ error: "Session expired" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const subpath = searchParams.get("path") ?? "";

  const resolved = path.resolve(MEDIA_DIR, subpath);
  if (!isWithinMediaDir(resolved)) {
    return NextResponse.json({ error: "Invalid path." }, { status: 400 });
  }

  let entries: fs.Dirent[];
  try {
    entries = await fs.promises.readdir(resolved, { withFileTypes: true }) as fs.Dirent[];
  } catch (error) {
    console.error("Failed to read media directory:", error);
    return NextResponse.json({ path: subpath, dirs: [], files: [] });
  }

  const dirs = entries
    .filter(e => e.isDirectory())
    .map(e => e.name)
    .sort();

  const files = entries
    .filter(e => e.isFile() && ALLOWED_EXTENSIONS.has(path.extname(e.name).toLowerCase()))
    .map(e => e.name)
    .sort();

  return NextResponse.json({ path: subpath, dirs, files });
}

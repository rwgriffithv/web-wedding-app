import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { MEDIA_DIR, ensureMediaDir } from "@/lib/media";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const ALLOWED_EXTENSIONS = new Set([
  ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg",
  ".mp4", ".webm", ".mov",
]);

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    return NextResponse.json({ error: "File exceeds 50 MB limit." }, { status: 400 });
  }

  ensureMediaDir();

  const filename = `${randomUUID()}${ext}`;
  const filepath = path.join(MEDIA_DIR, filename);
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    await fs.promises.writeFile(filepath, buffer);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to save file." }, { status: 500 });
  }

  return NextResponse.json({ url: `/api/media/${filename}` });
}

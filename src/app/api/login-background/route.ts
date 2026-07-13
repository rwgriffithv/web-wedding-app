import { NextResponse } from "next/server";
import { getConfig } from "@/lib/repository/site-config";
import { MEDIA_DIR, IMAGE_EXTENSIONS, isWithinMediaDir, MIME_TYPES } from "@/lib/media";
import fs from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

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

  let stat: fs.Stats;
  try {
    stat = await fs.promises.stat(resolved);
  } catch {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const stream = fs.createReadStream(resolved);
  const readable = new ReadableStream({
    start(controller) {
      stream.on("data", (chunk) => {
        if (typeof chunk === "string") {
          controller.enqueue(new TextEncoder().encode(chunk));
        } else {
          controller.enqueue(new Uint8Array(chunk));
        }
      });
      stream.on("end", () => controller.close());
      stream.on("error", (err) => controller.error(err));
    },
    cancel() {
      stream.destroy();
    },
  });

  return new NextResponse(readable, {
    headers: {
      "Content-Type": MIME_TYPES[ext],
      "Content-Length": String(stat.size),
      "Cache-Control": "public, max-age=300",
    },
  });
}

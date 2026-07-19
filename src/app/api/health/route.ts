import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  try {
    const db = getDb();
    db.prepare("SELECT 1").get();
    return NextResponse.json({ success: true, data: { status: "ok", database: "connected" } });
  } catch {
    return NextResponse.json({ success: false, error: "Database connection failed", data: { status: "error", database: "disconnected" } }, { status: 503 });
  }
}

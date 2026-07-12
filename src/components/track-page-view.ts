"use server";

import { parseSession } from "@/lib/auth";
import { incrementPageViews } from "@/lib/repository/users";

export async function trackPageView(): Promise<void> {
  const session = await parseSession();
  if (!session || !session.userId) return;
  incrementPageViews(session.userId);
}

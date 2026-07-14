"use server";

import { parseSession } from "@/lib/auth";
import { incrementPageViews } from "@/lib/repository/users";
import { getConfig } from "@/lib/repository/site-config";

function getPageViewDebounceMinutes(): number {
  const minutes = parseInt(getConfig("page_view_debounce_minutes"), 10);
  return Number.isFinite(minutes) && minutes > 0 ? Math.min(minutes, 1440) : 15;
}

export async function trackPageView(): Promise<void> {
  const session = await parseSession();
  if (!session || !session.userId) return;
  incrementPageViews(session.userId, getPageViewDebounceMinutes());
}

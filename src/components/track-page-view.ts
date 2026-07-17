"use server";

import { verifyTokenInCookie } from "@/lib/auth";
import { incrementPageViews } from "@/lib/repository/users";
import { getConfig } from "@/lib/repository/site-config";

function getPageViewDebounceMinutes(): number {
  const minutes = parseInt(getConfig("page_view_debounce_minutes"), 10);
  return Number.isFinite(minutes) && minutes > 0 ? Math.min(minutes, 1440) : 15;
}

  /** Intentionally uses verifyTokenInCookie() (fast path) instead of validateSessionInDb().
 *  Page view counting is a low-stakes counter — a stale session writing one extra
 *  view is not worth a DB query on every page load. */
export async function trackPageView(): Promise<void> {
  const session = await verifyTokenInCookie();
  if (!session || !session.userId) return;
  incrementPageViews(session.userId, getPageViewDebounceMinutes());
}

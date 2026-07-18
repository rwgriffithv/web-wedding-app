"use server";

import { verifyTokenInCookie } from "@/lib/auth";
import { incrementPageViews } from "@/lib/repository/users";
import { getPageViewDebounceMinutes } from "@/lib/repository/site-config";

/**
 * Intentionally uses verifyTokenInCookie() (fast path) instead of validateSessionInDb().
 * Page view counting is a low-stakes counter — a stale session writing one extra
 * view is not worth a DB query on every page load.
 */
export async function trackPageView(): Promise<{ debounceMinutes: number }> {
  const session = await verifyTokenInCookie();
  const debounceMinutes = getPageViewDebounceMinutes();
  if (!session || !session.userId) return { debounceMinutes };
  incrementPageViews(session.userId, debounceMinutes);
  return { debounceMinutes };
}

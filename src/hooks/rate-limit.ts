"use client";

import { useState, useEffect, useRef } from "react";
import { getExpirationRemaining, setExpiration } from "@/lib/localstorage-cache";

/**
 * Client-side rate-limit cooldown backed by localStorage.
 *
 * On mount, reads localStorage to restore any active cooldown (page reload persistence).
 * When the server returns `cooldownUntil`, call `syncFromResponse()` to persist the
 * cooldown client-side and start the countdown — no race condition.
 *
 * Returns `cooldown` (seconds remaining) and helpers to trigger/clear it.
 */
export function useRateLimitCooldown(key: string) {
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const remaining = getExpirationRemaining(key);
    if (remaining > 0) setCooldown(remaining);
  }, [key]);

  // Only re-run the interval effect when the boolean flips between active/inactive,
  // not on every cooldown value change.
  useEffect(() => {
    if (cooldown <= 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [cooldown > 0]);

  /** Check if currently rate-limited. If so, sets cooldown and returns true. */
  function checkRateLimit(): boolean {
    const remaining = getExpirationRemaining(key);
    if (remaining > 0) {
      setCooldown(remaining);
      return true;
    }
    return false;
  }

  /**
   * Sync cooldown from a server response timestamp.
   * Persists to localStorage client-side (no race condition) and starts the countdown.
   */
  function syncFromResponse(cooldownUntil: number): void {
    const remaining = Math.ceil((cooldownUntil - Date.now()) / 1000);
    if (remaining > 0) {
      setExpiration(key, cooldownUntil);
      setCooldown(remaining);
    }
  }

  return { cooldown, isLimited: cooldown > 0, checkRateLimit, syncFromResponse };
}

export type CooldownProps = ReturnType<typeof useRateLimitCooldown>;

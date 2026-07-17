"use client";

import { useState, useEffect, useRef } from "react";

function getRateLimitRemaining(key: string): number {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return 0;
    const until = parseInt(raw, 10);
    if (!Number.isFinite(until)) return 0;
    const remaining = Math.ceil((until - Date.now()) / 1000);
    return remaining > 0 ? remaining : 0;
  } catch {
    return 0;
  }
}

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
    const remaining = getRateLimitRemaining(key);
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
    const remaining = getRateLimitRemaining(key);
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
      try { localStorage.setItem(key, String(cooldownUntil)); } catch { /* storage unavailable */ }
      setCooldown(remaining);
    }
  }

  return { cooldown, isLimited: cooldown > 0, checkRateLimit, syncFromResponse };
}

export type CooldownProps = ReturnType<typeof useRateLimitCooldown>;

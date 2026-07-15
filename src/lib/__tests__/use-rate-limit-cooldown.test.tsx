import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRateLimitCooldown } from "../use-rate-limit-cooldown";

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${value}`;
}

function clearCookie(name: string) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

describe("useRateLimitCooldown", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    clearCookie("rl_test");
  });

  afterEach(() => {
    vi.useRealTimers();
    clearCookie("rl_test");
  });

  it("returns cooldown=0 and isLimited=false when no cookie", () => {
    const { result } = renderHook(() => useRateLimitCooldown("rl_test"));
    expect(result.current.cooldown).toBe(0);
    expect(result.current.isLimited).toBe(false);
  });

  it("reads remaining cooldown from cookie on mount", () => {
    setCookie("rl_test", String(Date.now() + 10_000));
    const { result } = renderHook(() => useRateLimitCooldown("rl_test"));
    expect(result.current.cooldown).toBeGreaterThanOrEqual(9);
    expect(result.current.cooldown).toBeLessThanOrEqual(10);
    expect(result.current.isLimited).toBe(true);
  });

  it("ignores expired cookie on mount", () => {
    setCookie("rl_test", String(Date.now() - 1000));
    const { result } = renderHook(() => useRateLimitCooldown("rl_test"));
    expect(result.current.cooldown).toBe(0);
    expect(result.current.isLimited).toBe(false);
  });

  it("syncFromResponse sets cookie and starts cooldown", () => {
    const { result } = renderHook(() => useRateLimitCooldown("rl_test"));
    expect(result.current.cooldown).toBe(0);

    act(() => result.current.syncFromResponse(Date.now() + 10_000));

    expect(result.current.cooldown).toBeGreaterThanOrEqual(9);
    expect(result.current.cooldown).toBeLessThanOrEqual(10);
    expect(result.current.isLimited).toBe(true);

    // Cookie was created client-side
    expect(document.cookie).toContain("rl_test=");
  });

  it("syncFromResponse ignores expired timestamp", () => {
    const { result } = renderHook(() => useRateLimitCooldown("rl_test"));
    act(() => result.current.syncFromResponse(Date.now() - 1000));
    expect(result.current.cooldown).toBe(0);
    expect(result.current.isLimited).toBe(false);
  });

  it("checkRateLimit returns false when no cookie", () => {
    const { result } = renderHook(() => useRateLimitCooldown("rl_test"));
    let blocked = false;
    act(() => { blocked = result.current.checkRateLimit(); });
    expect(blocked).toBe(false);
    expect(result.current.cooldown).toBe(0);
  });

  it("checkRateLimit returns true and sets cooldown when cookie present", () => {
    setCookie("rl_test", String(Date.now() + 10_000));
    const { result } = renderHook(() => useRateLimitCooldown("rl_test"));
    let blocked = false;
    act(() => { blocked = result.current.checkRateLimit(); });
    expect(blocked).toBe(true);
    expect(result.current.cooldown).toBeGreaterThanOrEqual(9);
    expect(result.current.isLimited).toBe(true);
  });

  it("cooldown decrements over time and clears", () => {
    setCookie("rl_test", String(Date.now() + 5_000));
    const { result } = renderHook(() => useRateLimitCooldown("rl_test"));
    expect(result.current.cooldown).toBeGreaterThanOrEqual(4);
    expect(result.current.isLimited).toBe(true);

    act(() => vi.advanceTimersByTime(2_000));
    expect(result.current.cooldown).toBeGreaterThanOrEqual(2);
    expect(result.current.cooldown).toBeLessThanOrEqual(3);

    act(() => vi.advanceTimersByTime(4_000));
    expect(result.current.cooldown).toBe(0);
    expect(result.current.isLimited).toBe(false);
  });

  it("timer is cleaned up when cooldown reaches zero", () => {
    setCookie("rl_test", String(Date.now() + 1_000));
    const { result } = renderHook(() => useRateLimitCooldown("rl_test"));
    expect(result.current.isLimited).toBe(true);

    act(() => vi.advanceTimersByTime(2_000));
    expect(result.current.isLimited).toBe(false);

    // Advancing more should not cause issues
    act(() => vi.advanceTimersByTime(5_000));
    expect(result.current.cooldown).toBe(0);
    expect(result.current.isLimited).toBe(false);
  });

  it("uses different cookies for different names", () => {
    setCookie("rl_a", String(Date.now() + 10_000));
    setCookie("rl_b", String(Date.now() + 20_000));

    const { result: resultA } = renderHook(() => useRateLimitCooldown("rl_a"));
    const { result: resultB } = renderHook(() => useRateLimitCooldown("rl_b"));

    expect(resultA.current.isLimited).toBe(true);
    expect(resultB.current.isLimited).toBe(true);

    // Clear rl_a cookie — mount reads nothing, cooldown clears
    clearCookie("rl_a");
    const { result: resultA2 } = renderHook(() => useRateLimitCooldown("rl_a"));
    expect(resultA2.current.cooldown).toBe(0);

    // syncFromResponse on rl_a creates its own cookie independently
    act(() => resultA.current.syncFromResponse(Date.now() + 5_000));
    expect(resultA.current.isLimited).toBe(true);

    // resultB still limited from its own cookie
    expect(resultB.current.isLimited).toBe(true);
  });
});

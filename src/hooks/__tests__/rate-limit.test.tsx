import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRateLimitCooldown } from "../rate-limit";

describe("useRateLimitCooldown", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.removeItem("rl_test");
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.removeItem("rl_test");
  });

  it("returns cooldown=0 and isLimited=false when no key", () => {
    const { result } = renderHook(() => useRateLimitCooldown("rl_test"));
    expect(result.current.cooldown).toBe(0);
    expect(result.current.isLimited).toBe(false);
  });

  it("reads remaining cooldown from localStorage on mount", () => {
    localStorage.setItem("rl_test", String(Date.now() + 10_000));
    const { result } = renderHook(() => useRateLimitCooldown("rl_test"));
    expect(result.current.cooldown).toBeGreaterThanOrEqual(9);
    expect(result.current.cooldown).toBeLessThanOrEqual(10);
    expect(result.current.isLimited).toBe(true);
  });

  it("ignores expired key on mount", () => {
    localStorage.setItem("rl_test", String(Date.now() - 1000));
    const { result } = renderHook(() => useRateLimitCooldown("rl_test"));
    expect(result.current.cooldown).toBe(0);
    expect(result.current.isLimited).toBe(false);
  });

  it("syncFromResponse persists to localStorage and starts cooldown", () => {
    const { result } = renderHook(() => useRateLimitCooldown("rl_test"));
    expect(result.current.cooldown).toBe(0);

    act(() => result.current.syncFromResponse(Date.now() + 10_000));

    expect(result.current.cooldown).toBeGreaterThanOrEqual(9);
    expect(result.current.cooldown).toBeLessThanOrEqual(10);
    expect(result.current.isLimited).toBe(true);

    // localStorage was written client-side
    expect(localStorage.getItem("rl_test")).toBeTruthy();
  });

  it("syncFromResponse ignores expired timestamp", () => {
    const { result } = renderHook(() => useRateLimitCooldown("rl_test"));
    act(() => result.current.syncFromResponse(Date.now() - 1000));
    expect(result.current.cooldown).toBe(0);
    expect(result.current.isLimited).toBe(false);
  });

  it("checkRateLimit returns false when no key", () => {
    const { result } = renderHook(() => useRateLimitCooldown("rl_test"));
    let blocked = false;
    act(() => { blocked = result.current.checkRateLimit(); });
    expect(blocked).toBe(false);
    expect(result.current.cooldown).toBe(0);
  });

  it("checkRateLimit returns true and sets cooldown when key present", () => {
    localStorage.setItem("rl_test", String(Date.now() + 10_000));
    const { result } = renderHook(() => useRateLimitCooldown("rl_test"));
    let blocked = false;
    act(() => { blocked = result.current.checkRateLimit(); });
    expect(blocked).toBe(true);
    expect(result.current.cooldown).toBeGreaterThanOrEqual(9);
    expect(result.current.isLimited).toBe(true);
  });

  it("cooldown decrements over time and clears", () => {
    localStorage.setItem("rl_test", String(Date.now() + 5_000));
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
    localStorage.setItem("rl_test", String(Date.now() + 1_000));
    const { result } = renderHook(() => useRateLimitCooldown("rl_test"));
    expect(result.current.isLimited).toBe(true);

    act(() => vi.advanceTimersByTime(2_000));
    expect(result.current.isLimited).toBe(false);

    // Advancing more should not cause issues
    act(() => vi.advanceTimersByTime(5_000));
    expect(result.current.cooldown).toBe(0);
    expect(result.current.isLimited).toBe(false);
  });

  it("uses different keys for different names", () => {
    localStorage.setItem("rl_a", String(Date.now() + 10_000));
    localStorage.setItem("rl_b", String(Date.now() + 20_000));

    const { result: resultA } = renderHook(() => useRateLimitCooldown("rl_a"));
    const { result: resultB } = renderHook(() => useRateLimitCooldown("rl_b"));

    expect(resultA.current.isLimited).toBe(true);
    expect(resultB.current.isLimited).toBe(true);

    // Clear rl_a — mount reads nothing, cooldown clears
    localStorage.removeItem("rl_a");
    const { result: resultA2 } = renderHook(() => useRateLimitCooldown("rl_a"));
    expect(resultA2.current.cooldown).toBe(0);

    // syncFromResponse on rl_a writes its own key independently
    act(() => resultA.current.syncFromResponse(Date.now() + 5_000));
    expect(resultA.current.isLimited).toBe(true);

    // resultB still limited from its own key
    expect(resultB.current.isLimited).toBe(true);
  });
});

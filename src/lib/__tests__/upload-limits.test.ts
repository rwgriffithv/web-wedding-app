import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MEDIA_MAX_FILE_SIZE_MB_KEY } from "@/lib/constants";

describe("getMaxFileSizeBytes", () => {
  beforeEach(() => {
    localStorage.removeItem(MEDIA_MAX_FILE_SIZE_MB_KEY);
  });

  afterEach(() => {
    localStorage.removeItem(MEDIA_MAX_FILE_SIZE_MB_KEY);
  });

  function writeCachedValue(value: number) {
    localStorage.setItem(
      MEDIA_MAX_FILE_SIZE_MB_KEY,
      JSON.stringify({ value, exp: Date.now() + 60_000 }),
    );
  }

  it("returns null when localStorage is empty", async () => {
    const { getMaxFileSizeBytes } = await import("../upload-limits");
    expect(getMaxFileSizeBytes()).toBeNull();
  });

  it("returns localStorage value in bytes when set", async () => {
    writeCachedValue(32);
    const { getMaxFileSizeBytes } = await import("../upload-limits");
    expect(getMaxFileSizeBytes()).toBe(32 * 1024 * 1024);
  });

  it("reads only from localStorage, does not query DB", async () => {
    writeCachedValue(64);
    const { getMaxFileSizeBytes } = await import("../upload-limits");
    const localStorageSpy = vi.spyOn(Storage.prototype, "getItem");

    const result = getMaxFileSizeBytes();

    expect(result).toBe(64 * 1024 * 1024);
    expect(localStorageSpy).toHaveBeenCalledWith(MEDIA_MAX_FILE_SIZE_MB_KEY);
    localStorageSpy.mockRestore();
  });

  it("returns null when localStorage has malformed JSON", async () => {
    localStorage.setItem(MEDIA_MAX_FILE_SIZE_MB_KEY, "not-a-number");
    const { getMaxFileSizeBytes } = await import("../upload-limits");
    expect(getMaxFileSizeBytes()).toBeNull();
  });

  it("returns 0 when cached value is zero (uploads disabled)", async () => {
    writeCachedValue(0);
    const { getMaxFileSizeBytes } = await import("../upload-limits");
    expect(getMaxFileSizeBytes()).toBe(0);
  });

  it("returns null when cached value is negative", async () => {
    writeCachedValue(-5);
    const { getMaxFileSizeBytes } = await import("../upload-limits");
    expect(getMaxFileSizeBytes()).toBeNull();
  });

  it("returns null when cached value is expired", async () => {
    localStorage.setItem(
      MEDIA_MAX_FILE_SIZE_MB_KEY,
      JSON.stringify({ value: 32, exp: Date.now() - 1000 }),
    );
    const { getMaxFileSizeBytes } = await import("../upload-limits");
    expect(getMaxFileSizeBytes()).toBeNull();
  });
});

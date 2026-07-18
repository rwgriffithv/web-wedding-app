import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { createTestDb, truncateAll } from "@/test/db-test-utils";
import type Database from "better-sqlite3";

let db: Database.Database;

vi.mock("@/lib/db", () => ({
  getDb: () => db,
}));

beforeAll(() => { db = createTestDb(); });
beforeEach(() => { truncateAll(db); });
afterAll(() => { db.close(); });

describe("site-config repository", () => {
  it("returns empty string for missing key", async () => {
    const { getConfig } = await import("@/lib/repository/site-config");
    expect(getConfig("nonexistent")).toBe("");
  });

  it("sets and retrieves a config value", async () => {
    const { getConfig, setConfig } = await import("@/lib/repository/site-config");
    setConfig("test_key", "test_value");
    expect(getConfig("test_key")).toBe("test_value");
  });

  it("returns all config entries", async () => {
    const { getAllConfig, setConfig } = await import("@/lib/repository/site-config");
    setConfig("alpha", "1");
    setConfig("beta", "2");
    const all = getAllConfig();
    expect(all.some((c) => c.key === "alpha" && c.value === "1")).toBe(true);
    expect(all.some((c) => c.key === "beta" && c.value === "2")).toBe(true);
  });
});

describe("getPageViewDebounceMinutes", () => {
  it("returns 15 by default when config is missing", async () => {
    const { getPageViewDebounceMinutes } = await import("@/lib/repository/site-config");
    expect(getPageViewDebounceMinutes()).toBe(15);
  });

  it("returns configured value", async () => {
    const { setConfig } = await import("@/lib/repository/site-config");
    setConfig("page_view_debounce_minutes", "30");
    const { getPageViewDebounceMinutes } = await import("@/lib/repository/site-config");
    expect(getPageViewDebounceMinutes()).toBe(30);
  });

  it("caps at 1440", async () => {
    const { setConfig } = await import("@/lib/repository/site-config");
    setConfig("page_view_debounce_minutes", "9999");
    const { getPageViewDebounceMinutes } = await import("@/lib/repository/site-config");
    expect(getPageViewDebounceMinutes()).toBe(1440);
  });

  it("returns 15 for NaN", async () => {
    const { setConfig } = await import("@/lib/repository/site-config");
    setConfig("page_view_debounce_minutes", "abc");
    const { getPageViewDebounceMinutes } = await import("@/lib/repository/site-config");
    expect(getPageViewDebounceMinutes()).toBe(15);
  });

  it("returns 0 when configured as zero (no debounce)", async () => {
    const { setConfig } = await import("@/lib/repository/site-config");
    setConfig("page_view_debounce_minutes", "0");
    const { getPageViewDebounceMinutes } = await import("@/lib/repository/site-config");
    expect(getPageViewDebounceMinutes()).toBe(0);
  });

  it("returns 15 for negative", async () => {
    const { setConfig } = await import("@/lib/repository/site-config");
    setConfig("page_view_debounce_minutes", "-5");
    const { getPageViewDebounceMinutes } = await import("@/lib/repository/site-config");
    expect(getPageViewDebounceMinutes()).toBe(15);
  });
});

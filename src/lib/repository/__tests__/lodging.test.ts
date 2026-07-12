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

describe("lodging repository", () => {
  it("creates and retrieves lodging options", async () => {
    const { create, getAll } = await import("@/lib/repository/lodging");
    create({ title: "Test Hotel", image_url: "https://example.com/img.jpg", url: "https://example.com" });

    const all = getAll();
    expect(all.length).toBe(1);
    expect(all[0].title).toBe("Test Hotel");
    expect(all[0].url).toBe("https://example.com");
    expect(all[0].thumbnail_url).toBeNull();
  });

  it("creates with thumbnail_url", async () => {
    const { create, getAll } = await import("@/lib/repository/lodging");
    create({ title: "Hotel with Thumb", image_url: "https://example.com/img.jpg", url: "https://example.com", thumbnail_url: "/api/media/thumbnails/test.webp" });

    const all = getAll();
    expect(all[0].thumbnail_url).toBe("/api/media/thumbnails/test.webp");
  });

  it("updates lodging option fields", async () => {
    const { create, update, getAll } = await import("@/lib/repository/lodging");
    const created = create({ title: "Original", image_url: "https://example.com/img.jpg", url: "https://example.com" });

    update(created.id, { title: "Updated Title", url: "https://new.example.com" });
    const all = getAll();
    expect(all.length).toBe(1);
    expect(all[0].title).toBe("Updated Title");
    expect(all[0].url).toBe("https://new.example.com");
    expect(all[0].image_url).toBe("https://example.com/img.jpg");
  });

  it("reorders lodging options", async () => {
    const { create, getAll, swapSortOrder } = await import("@/lib/repository/lodging");
    const first = create({ title: "First", image_url: "https://example.com/a.jpg", url: "https://a.com" });
    const second = create({ title: "Second", image_url: "https://example.com/b.jpg", url: "https://b.com" });

    swapSortOrder(first.id, first.sort_order, second.id, second.sort_order);

    const all = getAll();
    expect(all[0].title).toBe("Second");
    expect(all[1].title).toBe("First");
  });

  it("deletes a lodging option", async () => {
    const { create, getAll, deleteOption } = await import("@/lib/repository/lodging");
    const created = create({ title: "To Delete", image_url: "https://example.com/img.jpg", url: "https://example.com" });
    expect(getAll().length).toBe(1);

    deleteOption(created.id);
    expect(getAll().length).toBe(0);
  });
});

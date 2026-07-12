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

describe("media repository", () => {
  it("creates a media item", async () => {
    const { create, getAll } = await import("@/lib/repository/media");
    const item = create({ type: "image", url: "https://example.com/photo.jpg", title: "Test Photo", section: "Ceremony" });

    expect(item.type).toBe("image");
    expect(item.url).toBe("https://example.com/photo.jpg");
    expect(item.title).toBe("Test Photo");
    expect(item.section).toBe("Ceremony");
    expect(item.id).toBeGreaterThan(0);

    const all = getAll();
    expect(all.length).toBe(1);
  });

  it("creates a video with thumbnail", async () => {
    const { create, getBySection } = await import("@/lib/repository/media");
    const item = create({ type: "video", url: "https://example.com/video.mp4", thumbnail_url: "https://example.com/thumb.jpg", section: "Reception" });

    expect(item.type).toBe("video");
    expect(item.thumbnail_url).toBe("https://example.com/thumb.jpg");

    const reception = getBySection("Reception");
    expect(reception.length).toBe(1);
    expect(reception[0].id).toBe(item.id);
  });

  it("defaults section to General", async () => {
    const { create } = await import("@/lib/repository/media");
    const item = create({ type: "image", url: "https://example.com/default.jpg" });
    expect(item.section).toBe("General");
  });

  it("removes a media item", async () => {
    const { create, getAll, deleteItem } = await import("@/lib/repository/media");
    const item = create({ type: "image", url: "https://example.com/to-delete.jpg" });
    expect(getAll().length).toBe(1);

    deleteItem(item.id);
    expect(getAll().length).toBe(0);
  });
});

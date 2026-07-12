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

describe("dress-code repository", () => {
  it("adds and retrieves images", async () => {
    const { createImage, getImages } = await import("@/lib/repository/dress-code");
    const img = createImage("https://example.com/dress1.jpg");

    expect(img.image_url).toBe("https://example.com/dress1.jpg");
    expect(img.id).toBeGreaterThan(0);

    const all = getImages();
    expect(all.length).toBe(1);
    expect(all[0].image_url).toBe("https://example.com/dress1.jpg");
  });

  it("adds multiple images in order", async () => {
    const { createImage, getImages } = await import("@/lib/repository/dress-code");
    createImage("https://example.com/dress1.jpg");
    createImage("https://example.com/dress2.jpg");
    createImage("https://example.com/dress3.jpg");

    const all = getImages();
    expect(all.length).toBe(3);
    expect(all.map(i => i.image_url)).toEqual([
      "https://example.com/dress1.jpg",
      "https://example.com/dress2.jpg",
      "https://example.com/dress3.jpg",
    ]);
  });

  it("removes an image", async () => {
    const { createImage, getImages, deleteImage } = await import("@/lib/repository/dress-code");
    const img = createImage("https://example.com/to-remove.jpg");
    expect(getImages().length).toBe(1);

    deleteImage(img.id);
    expect(getImages().length).toBe(0);
  });
});

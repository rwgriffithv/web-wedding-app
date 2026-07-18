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

  it("adds multiple images in batch", async () => {
    const { createImages, getImages } = await import("@/lib/repository/dress-code");
    const items = [
      { imageUrl: "https://example.com/batch1.jpg" },
      { imageUrl: "https://example.com/batch2.jpg", thumbnailUrl: "/api/media/thumb.webp" },
      { imageUrl: "https://example.com/batch3.jpg" },
    ];
    const result = createImages(items);

    expect(result.length).toBe(3);
    expect(result[0].image_url).toBe("https://example.com/batch1.jpg");
    expect(result[0].thumbnail_url).toBeNull();
    expect(result[1].image_url).toBe("https://example.com/batch2.jpg");
    expect(result[1].thumbnail_url).toBe("/api/media/thumb.webp");
    expect(result[2].image_url).toBe("https://example.com/batch3.jpg");

    const all = getImages();
    expect(all.length).toBe(3);
    expect(all.map(i => i.sort_order)).toEqual([0, 1, 2]);
  });

  it("returns empty array for empty batch", async () => {
    const { createImages } = await import("@/lib/repository/dress-code");
    const result = createImages([]);
    expect(result).toEqual([]);
  });

  it("swaps sort order between two images", async () => {
    const { createImage, getImages, swapSortOrder } = await import("@/lib/repository/dress-code");
    const a = createImage("https://example.com/first.jpg");
    const b = createImage("https://example.com/second.jpg");

    const result = swapSortOrder(a.id, "down");
    expect(result.success).toBe(true);

    const all = getImages();
    expect(all[0].id).toBe(b.id);
    expect(all[1].id).toBe(a.id);
  });

  it("returns error when moving first item up", async () => {
    const { createImage, swapSortOrder } = await import("@/lib/repository/dress-code");
    const a = createImage("https://example.com/first.jpg");
    createImage("https://example.com/second.jpg");

    const result = swapSortOrder(a.id, "up");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Already at top.");
  });

  it("returns error when moving last item down", async () => {
    const { createImage, swapSortOrder } = await import("@/lib/repository/dress-code");
    createImage("https://example.com/first.jpg");
    const b = createImage("https://example.com/second.jpg");

    const result = swapSortOrder(b.id, "down");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Already at bottom.");
  });

  it("returns error for nonexistent image", async () => {
    const { swapSortOrder } = await import("@/lib/repository/dress-code");
    const result = swapSortOrder(9999, "up");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Image not found.");
  });
});

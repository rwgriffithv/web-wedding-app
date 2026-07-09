import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Database from "better-sqlite3";
import { DDL } from "@/lib/schema";

let db: Database.Database;

vi.mock("@/lib/db", () => ({
  getDb: () => db,
}));

beforeAll(() => {
  db = new Database(":memory:");
  db.exec(DDL);
});

afterAll(() => {
  db.close();
});

describe("dress-code repository", () => {
  it("adds and retrieves images", async () => {
    const { addImage, getImages } = await import("@/lib/repository/dress-code");
    const img = addImage("https://example.com/dress1.jpg");

    expect(img.image_url).toBe("https://example.com/dress1.jpg");
    expect(img.id).toBeGreaterThan(0);

    const all = getImages();
    expect(all.length).toBe(1);
    expect(all[0].image_url).toBe("https://example.com/dress1.jpg");
  });

  it("adds multiple images in order", async () => {
    const { addImage, getImages } = await import("@/lib/repository/dress-code");
    addImage("https://example.com/dress2.jpg");
    addImage("https://example.com/dress3.jpg");

    const all = getImages();
    expect(all.length).toBe(3);
    expect(all.map(i => i.image_url)).toEqual([
      "https://example.com/dress1.jpg",
      "https://example.com/dress2.jpg",
      "https://example.com/dress3.jpg",
    ]);
  });

  it("removes an image", async () => {
    const { addImage, getImages, removeImage } = await import("@/lib/repository/dress-code");
    const before = getImages().length;
    const img = addImage("https://example.com/to-remove.jpg");

    expect(getImages().length).toBe(before + 1);

    removeImage(img.id);
    expect(getImages().length).toBe(before);
  });
});

import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { createTestDb, truncateAll } from "@/test/db-test-utils";
import type Database from "better-sqlite3";

let db: Database.Database;

vi.mock("@/lib/db", () => ({
  getDb: () => db,
}));

vi.mock("@/lib/media", () => ({
  deleteThumbnail: vi.fn(),
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

  it("swaps item sort order within section", async () => {
    const { create, getBySection, swapItemSortOrder } = await import("@/lib/repository/media");
    const a = create({ type: "image", url: "https://example.com/a.jpg", section: "Ceremony" });
    const b = create({ type: "image", url: "https://example.com/b.jpg", section: "Ceremony" });

    const result = swapItemSortOrder(a.id, "down");
    expect(result.success).toBe(true);

    const section = getBySection("Ceremony");
    expect(section[0].id).toBe(b.id);
    expect(section[1].id).toBe(a.id);
  });

  it("does not swap items across sections", async () => {
    const { create, getBySection, swapItemSortOrder } = await import("@/lib/repository/media");
    const a = create({ type: "image", url: "https://example.com/a.jpg", section: "Ceremony" });
    const b = create({ type: "image", url: "https://example.com/b.jpg", section: "Reception" });

    const result = swapItemSortOrder(a.id, "down");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Already at bottom.");

    const ceremony = getBySection("Ceremony");
    expect(ceremony[0].id).toBe(a.id);
    const reception = getBySection("Reception");
    expect(reception[0].id).toBe(b.id);
  });

  it("returns error for nonexistent item", async () => {
    const { swapItemSortOrder } = await import("@/lib/repository/media");
    const result = swapItemSortOrder(9999, "up");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Media item not found.");
  });

  it("swaps tab sort order", async () => {
    const { createTab, getAllTabs, swapTabSortOrder } = await import("@/lib/repository/media");
    const a = createTab({ slug: "first", label: "First" });
    const b = createTab({ slug: "second", label: "Second" });

    const result = swapTabSortOrder(a.id, "down");
    expect(result.success).toBe(true);

    const tabs = getAllTabs();
    expect(tabs[0].id).toBe(b.id);
    expect(tabs[1].id).toBe(a.id);
  });

  it("returns error when moving first tab up", async () => {
    const { createTab, swapTabSortOrder } = await import("@/lib/repository/media");
    const a = createTab({ slug: "first", label: "First" });
    createTab({ slug: "second", label: "Second" });

    const result = swapTabSortOrder(a.id, "up");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Already at top.");
  });

  it("returns error for nonexistent tab", async () => {
    const { swapTabSortOrder } = await import("@/lib/repository/media");
    const result = swapTabSortOrder(9999, "down");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Media tab not found.");
  });

  it("updates title and section of a media item", async () => {
    const { create, update, getAll } = await import("@/lib/repository/media");
    const item = create({ type: "image", url: "https://example.com/photo.jpg", title: "Old Title", section: "Ceremony" });

    update(item.id, { title: "New Title", section: "Reception" });

    const items = getAll();
    expect(items.length).toBe(1);
    expect(items[0].title).toBe("New Title");
    expect(items[0].section).toBe("Reception");
  });

  it("updates only title when section not provided", async () => {
    const { create, update, getAll } = await import("@/lib/repository/media");
    const item = create({ type: "image", url: "https://example.com/photo.jpg", title: "Old Title", section: "Ceremony" });

    update(item.id, { title: "Updated" });

    const items = getAll();
    expect(items[0].title).toBe("Updated");
    expect(items[0].section).toBe("Ceremony");
  });

  it("throws when updating nonexistent item", async () => {
    const { update } = await import("@/lib/repository/media");
    expect(() => update(9999, { title: "test" })).toThrow("Media item 9999 not found");
  });

  it("updates tab label", async () => {
    const { createTab, updateTab, getAllTabs } = await import("@/lib/repository/media");
    const tab = createTab({ slug: "ceremony", label: "Ceremony" });

    updateTab(tab.id, { label: "Ceremony Photos" });

    const tabs = getAllTabs();
    expect(tabs.length).toBe(1);
    expect(tabs[0].label).toBe("Ceremony Photos");
  });

  it("throws when updating nonexistent tab", async () => {
    const { updateTab } = await import("@/lib/repository/media");
    expect(() => updateTab(9999, { label: "test" })).toThrow("Media tab 9999 not found");
  });

  it("deletes tab and cascades to items", async () => {
    const { createTab, create, deleteTab, getAllTabs, getAll } = await import("@/lib/repository/media");
    const tab1 = createTab({ slug: "ceremony", label: "Ceremony" });
    const tab2 = createTab({ slug: "reception", label: "Reception" });
    create({ type: "image", url: "https://example.com/a.jpg", section: tab1.slug });
    create({ type: "image", url: "https://example.com/b.jpg", section: tab1.slug });
    create({ type: "image", url: "https://example.com/c.jpg", section: tab2.slug });

    deleteTab(tab1.id);

    expect(getAllTabs().length).toBe(1);
    expect(getAllTabs()[0].slug).toBe("reception");
    expect(getAll().length).toBe(1);
    expect(getAll()[0].section).toBe("reception");
  });

  it("throws when deleting nonexistent tab", async () => {
    const { deleteTab } = await import("@/lib/repository/media");
    expect(() => deleteTab(9999)).toThrow("Media tab 9999 not found");
  });

  it("deletes tab and cleans up thumbnails", async () => {
    const { createTab, create, deleteTab } = await import("@/lib/repository/media");
    const { deleteThumbnail } = await import("@/lib/media");
    vi.mocked(deleteThumbnail).mockClear();
    const tab = createTab({ slug: "photos", label: "Photos" });
    create({ type: "image", url: "https://example.com/a.jpg", thumbnail_url: "/api/media/thumb-a.webp", section: tab.slug });
    create({ type: "video", url: "https://example.com/b.mp4", thumbnail_url: "/api/media/thumb-b.webp", section: tab.slug });

    deleteTab(tab.id);

    expect(deleteThumbnail).toHaveBeenCalledTimes(2);
    expect(deleteThumbnail).toHaveBeenCalledWith("/api/media/thumb-a.webp");
    expect(deleteThumbnail).toHaveBeenCalledWith("/api/media/thumb-b.webp");
  });
});

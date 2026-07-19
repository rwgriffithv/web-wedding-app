import { describe, it, expect } from "vitest";
import { ALLOWED_EXTENSIONS, IMAGE_EXTENSIONS, MIME_TYPES } from "@/lib/media";

describe("media utilities", () => {
  describe("SVG is excluded for security", () => {
    it("does not include .svg in ALLOWED_EXTENSIONS", () => {
      expect(ALLOWED_EXTENSIONS.has(".svg")).toBe(false);
    });

    it("does not include .svg in IMAGE_EXTENSIONS", () => {
      expect(IMAGE_EXTENSIONS.has(".svg")).toBe(false);
    });

    it("does not include .svg in MIME_TYPES", () => {
      expect(".svg" in MIME_TYPES).toBe(false);
    });

    it("still includes standard image formats", () => {
      for (const ext of [".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif"]) {
        expect(ALLOWED_EXTENSIONS.has(ext)).toBe(true);
        expect(IMAGE_EXTENSIONS.has(ext)).toBe(true);
        expect(MIME_TYPES[ext]).toBeDefined();
      }
    });

    it("still includes standard video formats", () => {
      for (const ext of [".mp4", ".webm", ".mov"]) {
        expect(ALLOWED_EXTENSIONS.has(ext)).toBe(true);
        expect(MIME_TYPES[ext]).toBeDefined();
      }
    });
  });
});

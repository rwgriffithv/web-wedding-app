import { describe, it, expect } from "vitest";
import { getRequiredString, getOptionalString, getInt, validateMediaUrl } from "@/lib/form-data";

function formData(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.set(k, v);
  return fd;
}

describe("getRequiredString", () => {
  it("returns the value when present and non-empty", () => {
    expect(getRequiredString(formData({ title: "Hello" }), "title")).toBe("Hello");
  });

  it("returns null for empty string", () => {
    expect(getRequiredString(formData({ title: "" }), "title")).toBeNull();
  });

  it("returns null for missing key", () => {
    expect(getRequiredString(formData({}), "title")).toBeNull();
  });
});

describe("getOptionalString", () => {
  it("returns the value when present", () => {
    expect(getOptionalString(formData({ title: "Hello" }), "title")).toBe("Hello");
  });

  it("returns empty string for empty value", () => {
    expect(getOptionalString(formData({ title: "" }), "title")).toBe("");
  });

  it("returns empty string for missing key", () => {
    expect(getOptionalString(formData({}), "title")).toBe("");
  });
});

describe("getInt", () => {
  it("returns parsed integer for valid input", () => {
    expect(getInt(formData({ id: "42" }), "id")).toBe(42);
  });

  it("returns null for missing key", () => {
    expect(getInt(formData({}), "id")).toBeNull();
  });

  it("returns null for non-numeric input", () => {
    expect(getInt(formData({ id: "abc" }), "id")).toBeNull();
  });

  it("returns null for zero", () => {
    expect(getInt(formData({ id: "0" }), "id")).toBeNull();
  });

  it("returns null for negative", () => {
    expect(getInt(formData({ id: "-1" }), "id")).toBeNull();
  });
});

describe("validateMediaUrl", () => {
  it("rejects .. path segments", () => {
    expect(validateMediaUrl("/media/../etc/passwd")).toBe("Invalid path segment.");
  });

  it("rejects . path segment", () => {
    expect(validateMediaUrl("/media/./photo.jpg")).toBe("Invalid path segment.");
  });

  it("rejects empty string", () => {
    expect(validateMediaUrl("")).toBe("Invalid URL format.");
  });

  it("rejects invalid local path format", () => {
    expect(validateMediaUrl("/media/my file.jpg")).toBe("Invalid local path format.");
  });

  it("accepts valid local paths", () => {
    expect(validateMediaUrl("/media/photo.jpg")).toBeNull();
  });

  it("accepts valid nested local paths", () => {
    expect(validateMediaUrl("/media/subdir/photo.jpg")).toBeNull();
  });

  it("accepts valid HTTP URLs", () => {
    expect(validateMediaUrl("https://example.com/photo.jpg")).toBeNull();
  });

  it("accepts valid HTTP URLs with paths", () => {
    expect(validateMediaUrl("https://example.com/photos/wedding.jpg")).toBeNull();
  });

  it("rejects non-HTTP protocols", () => {
    expect(validateMediaUrl("ftp://example.com/file.jpg")).toBe("Only http/https URLs are allowed.");
  });
});

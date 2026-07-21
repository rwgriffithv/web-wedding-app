import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FileUpload } from "../file-upload";
import { MEDIA_MAX_FILE_SIZE_MB_KEY } from "@/lib/constants";

const mockGetMediaMaxFileSizeAction = vi.fn();
vi.mock("@/app/admin/media/actions", () => ({
  getMediaMaxFileSizeAction: (...args: unknown[]) => mockGetMediaMaxFileSizeAction(...args),
}));

const mockOnUpload = vi.fn();

function createFile(name: string, size: number, type = "image/jpeg"): File {
  return new File([new ArrayBuffer(size)], name, { type });
}

describe("FileUpload", () => {
  beforeEach(() => {
    mockOnUpload.mockReset();
    mockGetMediaMaxFileSizeAction.mockReset();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("updates localStorage cache when server rejects oversized upload (413)", async () => {
    localStorage.setItem(
      MEDIA_MAX_FILE_SIZE_MB_KEY,
      JSON.stringify({ value: 32, exp: Date.now() + 86_400_000 }),
    );

    // The refreshMaxBytes function fetches from the server action to get the current limit
    mockGetMediaMaxFileSizeAction.mockResolvedValue({ mb: 8, ttlSeconds: 60 });

    const mockFetch = vi.fn().mockResolvedValue({
      status: 413,
      ok: false,
      json: async () => ({
        success: false,
        error: "File exceeds 8 MB limit.",
        maxFileSizeMb: 8,
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const { container } = render(<FileUpload onUpload={mockOnUpload} />);

    const file = createFile("photo.jpg", 10 * 1024 * 1024);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/exceeds|failed/i);
    });

    const cached = JSON.parse(localStorage.getItem(MEDIA_MAX_FILE_SIZE_MB_KEY) || "{}");
    expect(cached.value).toBe(8);
    expect(typeof cached.exp).toBe("number");
    expect(cached.exp).toBeGreaterThan(Date.now());

    vi.unstubAllGlobals();
  });

  it("rejects files larger than cached max on client side", () => {
    localStorage.setItem(
      MEDIA_MAX_FILE_SIZE_MB_KEY,
      JSON.stringify({ value: 16, exp: Date.now() + 86_400_000 }),
    );

    const { container } = render(<FileUpload onUpload={mockOnUpload} accept="image/*" />);

    const file = createFile("large.jpg", 20 * 1024 * 1024);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByRole("alert")).toHaveTextContent(/exceeds 16 MB/i);
  });
});

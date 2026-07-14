import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MediaInput } from "../media-input";

vi.mock("@/components/file-upload", () => ({
  FileUpload: ({ label, accept, size }: { label?: string; accept?: string; size?: string }) => (
    <span data-testid="file-upload" data-label={label} data-accept={accept} data-size={size}>
      Upload
    </span>
  ),
}));

describe("MediaInput", () => {
  const defaultProps = {
    id: "test-url",
    name: "test-url",
    placeholder: "Enter URL",
    onUpload: vi.fn(),
    onBrowse: vi.fn(),
  };

  it("renders URL input with correct attributes", () => {
    render(<MediaInput {...defaultProps} />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("id", "test-url");
    expect(input).toHaveAttribute("name", "test-url");
    expect(input).toHaveAttribute("placeholder", "Enter URL");
  });

  it("renders FileUpload with sm size", () => {
    render(<MediaInput {...defaultProps} />);
    const upload = screen.getByTestId("file-upload");
    expect(upload).toHaveAttribute("data-size", "sm");
  });

  it("passes accept to FileUpload", () => {
    render(<MediaInput {...defaultProps} accept="video/*" />);
    const upload = screen.getByTestId("file-upload");
    expect(upload).toHaveAttribute("data-accept", "video/*");
  });

  it("defaults accept to image/*", () => {
    render(<MediaInput {...defaultProps} />);
    const upload = screen.getByTestId("file-upload");
    expect(upload).toHaveAttribute("data-accept", "image/*");
  });

  it("renders Local button", () => {
    render(<MediaInput {...defaultProps} />);
    expect(screen.getByRole("button", { name: "Local" })).toBeDefined();
  });

  it("Local button has btn-sm and btn-ghost classes", () => {
    render(<MediaInput {...defaultProps} />);
    const btn = screen.getByRole("button", { name: "Local" });
    expect(btn.className).toContain("btn-sm");
    expect(btn.className).toContain("btn-ghost");
  });

  it("passes defaultValue to input", () => {
    render(<MediaInput {...defaultProps} defaultValue="/api/media/existing.jpg" />);
    expect(screen.getByDisplayValue("/api/media/existing.jpg")).toBeDefined();
  });

  it("renders upload label from prop", () => {
    render(<MediaInput {...defaultProps} uploadLabel="Choose File" />);
    const upload = screen.getByTestId("file-upload");
    expect(upload).toHaveAttribute("data-label", "Choose File");
  });
});

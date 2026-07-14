import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ViolationList } from "../violation-list";
import type { RateLimitViolation } from "@/lib/db";

vi.mock("../actions", () => ({
  banViolationIpAction: vi.fn(),
}));

const makeViolations = (): RateLimitViolation[] => [
  { ip_address: "192.168.1.100", violation_count: 12, last_violated_at: "2026-07-14T10:30:00" },
  { ip_address: "10.0.0.55", violation_count: 7, last_violated_at: "2026-07-14T09:15:00" },
];

describe("ViolationList", () => {
  it("renders empty state when no violations", () => {
    render(<ViolationList violations={[]} />);
    expect(screen.getByText("No rate limit violations recorded.")).toBeDefined();
  });

  it("renders violation rows with IP, count, and timestamp", () => {
    render(<ViolationList violations={makeViolations()} />);
    expect(screen.getByText("192.168.1.100")).toBeDefined();
    expect(screen.getByText("10.0.0.55")).toBeDefined();
    expect(screen.getByText("12")).toBeDefined();
    expect(screen.getByText("7")).toBeDefined();
  });

  it("renders Ban button for each row", () => {
    render(<ViolationList violations={makeViolations()} />);
    const banButtons = screen.getAllByRole("button", { name: "Ban" });
    expect(banButtons).toHaveLength(2);
  });

  it("renders sortable column headers", () => {
    render(<ViolationList violations={makeViolations()} />);
    expect(screen.getByText(/Violations/)).toBeDefined();
    expect(screen.getByText(/Last Violation/)).toBeDefined();
  });

  it("renders IP addresses in monospace", () => {
    const { container } = render(<ViolationList violations={makeViolations()} />);
    const cells = container.querySelectorAll("td[style*='monospace']");
    expect(cells).toHaveLength(2);
  });

  it("contains hidden ip_address input for ban form", () => {
    const { container } = render(<ViolationList violations={makeViolations()} />);
    const hiddenInputs = container.querySelectorAll('input[name="ip_address"][type="hidden"]');
    expect(hiddenInputs).toHaveLength(2);
    expect((hiddenInputs[0] as HTMLInputElement).value).toBe("192.168.1.100");
    expect((hiddenInputs[1] as HTMLInputElement).value).toBe("10.0.0.55");
  });
});

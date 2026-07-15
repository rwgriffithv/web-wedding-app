import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SuspiciousIpList } from "../suspicious-ip-list";
import type { RateLimitViolation } from "@/lib/db";

vi.mock("../actions", () => ({
  banViolationIpAction: vi.fn(),
  clearViolationsAction: vi.fn(),
}));

const makeViolations = (): RateLimitViolation[] => [
  { ip_address: "192.168.1.100", violation_count: 12, last_violated_at: "2026-07-14T10:30:00" },
  { ip_address: "10.0.0.55", violation_count: 7, last_violated_at: "2026-07-14T09:15:00" },
];

describe("SuspiciousIpList", () => {
  it("renders empty state when no violations", () => {
    render(<SuspiciousIpList violations={[]} />);
    expect(screen.getByText("No suspicious IPs detected.")).toBeDefined();
  });

  it("renders violation rows with IP, count, and timestamp", () => {
    render(<SuspiciousIpList violations={makeViolations()} />);
    expect(screen.getByText("192.168.1.100")).toBeDefined();
    expect(screen.getByText("10.0.0.55")).toBeDefined();
    expect(screen.getByText("12")).toBeDefined();
    expect(screen.getByText("7")).toBeDefined();
  });

  it("renders Ban and Clear buttons for each row", () => {
    render(<SuspiciousIpList violations={makeViolations()} />);
    const banButtons = screen.getAllByRole("button", { name: "Ban" });
    const clearButtons = screen.getAllByRole("button", { name: "Clear" });
    expect(banButtons).toHaveLength(2);
    expect(clearButtons).toHaveLength(2);
  });

  it("renders sortable column headers", () => {
    render(<SuspiciousIpList violations={makeViolations()} />);
    expect(screen.getByText(/Total Violations/)).toBeDefined();
    expect(screen.getByText(/Last Violation/)).toBeDefined();
  });

  it("renders IP addresses in monospace", () => {
    const { container } = render(<SuspiciousIpList violations={makeViolations()} />);
    const cells = container.querySelectorAll("td[style*='monospace']");
    expect(cells).toHaveLength(2);
  });

  it("contains hidden ip_address inputs for ban and clear forms", () => {
    const { container } = render(<SuspiciousIpList violations={makeViolations()} />);
    const hiddenInputs = container.querySelectorAll('input[name="ip_address"][type="hidden"]');
    expect(hiddenInputs).toHaveLength(4);
  });
});

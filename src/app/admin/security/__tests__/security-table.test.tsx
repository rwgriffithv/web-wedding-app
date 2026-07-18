import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SecurityTable } from "../security-table";
import type { CombinedIp } from "@/lib/types";

vi.mock("../actions", () => ({
  banViolationIpAction: vi.fn(),
  unbanIpAction: vi.fn(),
  clearViolationsAction: vi.fn(),
}));

const makeIps = (): CombinedIp[] => [
  { ip_address: "192.168.1.100", is_banned: 0, ban_id: null, is_suspicious: 1, violation_count: 12, last_violated_at: "2026-07-14T10:30:00" },
  { ip_address: "10.0.0.55", is_banned: 1, ban_id: 7, is_suspicious: 0, violation_count: 0, last_violated_at: null },
  { ip_address: "172.16.0.1", is_banned: 0, ban_id: null, is_suspicious: 1, violation_count: 5, last_violated_at: "2026-07-14T09:15:00" },
];

describe("SecurityTable", () => {
  it("renders empty state when no IPs", () => {
    render(<SecurityTable ips={[]} />);
    expect(screen.getByText("No IPs with violations or bans.")).toBeDefined();
  });

  it("renders rows with IP addresses", () => {
    render(<SecurityTable ips={makeIps()} />);
    expect(screen.getByText("192.168.1.100")).toBeDefined();
    expect(screen.getByText("10.0.0.55")).toBeDefined();
    expect(screen.getByText("172.16.0.1")).toBeDefined();
  });

  it("renders column headers", () => {
    render(<SecurityTable ips={makeIps()} />);
    expect(screen.getByText("IP Address")).toBeDefined();
    expect(screen.getAllByText("Banned").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Suspicious").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Total Violations/)).toBeDefined();
    expect(screen.getByText(/Last Violation/)).toBeDefined();
    expect(screen.getByText("Actions")).toBeDefined();
  });

  it("renders ban toggle button for unbanned IPs", () => {
    render(<SecurityTable ips={makeIps()} />);
    const noButtons = screen.getAllByRole("button", { name: "No" });
    expect(noButtons.length).toBeGreaterThanOrEqual(1);
  });

  it("renders ban toggle button for banned IPs", () => {
    render(<SecurityTable ips={makeIps()} />);
    const yesButtons = screen.getAllByRole("button", { name: "Yes" });
    expect(yesButtons).toHaveLength(1);
  });

  it("renders suspicious indicator correctly", () => {
    render(<SecurityTable ips={makeIps()} />);
    const warningTexts = screen.getAllByText("Yes");
    expect(warningTexts.length).toBeGreaterThanOrEqual(1);
  });

  it("renders violation counts", () => {
    render(<SecurityTable ips={makeIps()} />);
    expect(screen.getByText("12")).toBeDefined();
    expect(screen.getByText("5")).toBeDefined();
  });

  it("renders Clear button only for IPs with violations", () => {
    render(<SecurityTable ips={makeIps()} />);
    const clearButtons = screen.getAllByRole("button", { name: "Clear" });
    expect(clearButtons).toHaveLength(2);
  });

  it("renders IP addresses in monospace", () => {
    const { container } = render(<SecurityTable ips={makeIps()} />);
    const cells = container.querySelectorAll("td[style*='monospace']");
    expect(cells).toHaveLength(3);
  });

  it("defaults to violation_count descending sort", () => {
    render(<SecurityTable ips={makeIps()} />);
    const rows = screen.getAllByRole("row");
    expect(rows[1].textContent).toContain("192.168.1.100");
    expect(rows[2].textContent).toContain("172.16.0.1");
    expect(rows[3].textContent).toContain("10.0.0.55");
  });

  it("toggles sort direction on repeated click", () => {
    render(<SecurityTable ips={makeIps()} />);
    const violationsTh = screen.getByText(/^Total Violations/).closest("th")!;
    fireEvent.click(violationsTh);
    const rowsAsc = screen.getAllByRole("row");
    expect(rowsAsc[1].textContent).toContain("10.0.0.55");
    expect(rowsAsc[3].textContent).toContain("192.168.1.100");
    fireEvent.click(violationsTh);
    const rowsDesc = screen.getAllByRole("row");
    expect(rowsDesc[1].textContent).toContain("192.168.1.100");
  });

  it("sorts by last_violated_at when header clicked", () => {
    render(<SecurityTable ips={makeIps()} />);
    const lastViolatedTh = screen.getByText(/Last Violation/).closest("th")!;
    fireEvent.click(lastViolatedTh);
    const rows = screen.getAllByRole("row");
    expect(rows[1].textContent).toContain("192.168.1.100");
    expect(rows[2].textContent).toContain("172.16.0.1");
    expect(rows[3].textContent).toContain("10.0.0.55");
  });

  it("shows sort arrow on active column", () => {
    render(<SecurityTable ips={makeIps()} />);
    const th = screen.getByText(/^Total Violations/).closest("th")!;
    expect(th.textContent).toContain("▼");
    fireEvent.click(th);
    expect(th.textContent).toContain("▲");
  });

  it("renders hidden inputs for ban form", () => {
    const { container } = render(<SecurityTable ips={makeIps()} />);
    const banInputs = container.querySelectorAll('input[name="ip_address"][type="hidden"]');
    expect(banInputs.length).toBeGreaterThanOrEqual(1);
  });

  it("renders hidden input for unban form", () => {
    const { container } = render(<SecurityTable ips={makeIps()} />);
    const unbanInputs = container.querySelectorAll('input[name="id"][type="hidden"]');
    expect(unbanInputs).toHaveLength(1);
  });

  it("renders filter buttons", () => {
    render(<SecurityTable ips={makeIps()} />);
    expect(screen.getByRole("button", { name: "All" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Banned" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Suspicious" })).toBeDefined();
  });

  it("filters to banned IPs only", () => {
    render(<SecurityTable ips={makeIps()} />);
    fireEvent.click(screen.getByRole("button", { name: "Banned" }));
    const rows = screen.getAllByRole("row");
    expect(rows).toHaveLength(2);
    expect(rows[1].textContent).toContain("10.0.0.55");
  });

  it("filters to suspicious IPs only", () => {
    render(<SecurityTable ips={makeIps()} />);
    fireEvent.click(screen.getByRole("button", { name: "Suspicious" }));
    const rows = screen.getAllByRole("row");
    expect(rows).toHaveLength(3);
    expect(rows[1].textContent).toContain("192.168.1.100");
    expect(rows[2].textContent).toContain("172.16.0.1");
  });

  it("shows all IPs after clicking All", () => {
    render(<SecurityTable ips={makeIps()} />);
    fireEvent.click(screen.getByRole("button", { name: "Banned" }));
    expect(screen.getAllByRole("row")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "All" }));
    expect(screen.getAllByRole("row")).toHaveLength(4);
  });

  it("shows filter-specific empty state", () => {
    const bannedOnly: CombinedIp[] = [
      { ip_address: "1.2.3.4", is_banned: 1, ban_id: 1, is_suspicious: 0, violation_count: 0, last_violated_at: null },
    ];
    render(<SecurityTable ips={bannedOnly} />);
    fireEvent.click(screen.getByRole("button", { name: "Suspicious" }));
    expect(screen.getByText("No suspicious IPs.")).toBeDefined();
  });
});

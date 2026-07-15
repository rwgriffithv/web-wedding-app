import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { IpTable } from "../ip-table";
import type { RateLimitViolation } from "@/lib/types";

const makeViolations = (): RateLimitViolation[] => [
  { ip_address: "192.168.1.100", violation_count: 12, last_violated_at: "2026-07-14T10:30:00" },
  { ip_address: "10.0.0.55", violation_count: 7, last_violated_at: "2026-07-14T09:15:00" },
];

describe("IpTable", () => {
  it("renders empty state message", () => {
    render(
      <IpTable violations={[]} emptyMessage="Nothing here" countHeader="Count" actions={() => null} />,
    );
    expect(screen.getByText("Nothing here")).toBeDefined();
  });

  it("renders rows with IP, count, and timestamp", () => {
    render(
      <IpTable violations={makeViolations()} emptyMessage="Empty" countHeader="Count" actions={() => null} />,
    );
    expect(screen.getByText("192.168.1.100")).toBeDefined();
    expect(screen.getByText("10.0.0.55")).toBeDefined();
    expect(screen.getByText("12")).toBeDefined();
    expect(screen.getByText("7")).toBeDefined();
  });

  it("renders custom count header", () => {
    render(
      <IpTable violations={makeViolations()} emptyMessage="Empty" countHeader="Total Violations" actions={() => null} />,
    );
    expect(screen.getByText(/Total Violations/)).toBeDefined();
  });

  it("renders action output from render prop", () => {
    render(
      <IpTable
        violations={makeViolations()}
        emptyMessage="Empty"
        countHeader="Count"
        actions={(v) => <button>{`Action-${v.ip_address}`}</button>}
      />,
    );
    expect(screen.getByRole("button", { name: "Action-192.168.1.100" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Action-10.0.0.55" })).toBeDefined();
  });

  it("renders sortable column headers", () => {
    render(
      <IpTable violations={makeViolations()} emptyMessage="Empty" countHeader="Violations" actions={() => null} />,
    );
    expect(screen.getByText(/Violations/)).toBeDefined();
    expect(screen.getByText(/Last Violation/)).toBeDefined();
  });

  it("renders IP addresses in monospace", () => {
    const { container } = render(
      <IpTable violations={makeViolations()} emptyMessage="Empty" countHeader="Count" actions={() => null} />,
    );
    const cells = container.querySelectorAll("td[style*='monospace']");
    expect(cells).toHaveLength(2);
  });

  it("defaults to violation_count descending sort", () => {
    render(
      <IpTable violations={makeViolations()} emptyMessage="Empty" countHeader="Count" actions={() => null} />,
    );
    const rows = screen.getAllByRole("row");
    // row 0 is header
    expect(rows[1].textContent).toContain("192.168.1.100");
    expect(rows[2].textContent).toContain("10.0.0.55");
  });

  it("toggles sort direction on repeated click", () => {
    render(
      <IpTable violations={makeViolations()} emptyMessage="Empty" countHeader="Violations" actions={() => null} />,
    );
    const violationsTh = screen.getByText(/^Violations/).closest("th")!;
    // First click: already desc, switches to asc
    fireEvent.click(violationsTh);
    const rowsAsc = screen.getAllByRole("row");
    expect(rowsAsc[1].textContent).toContain("10.0.0.55");
    expect(rowsAsc[2].textContent).toContain("192.168.1.100");

    // Second click: back to desc
    fireEvent.click(violationsTh);
    const rowsDesc = screen.getAllByRole("row");
    expect(rowsDesc[1].textContent).toContain("192.168.1.100");
    expect(rowsDesc[2].textContent).toContain("10.0.0.55");
  });

  it("sorts by last_violated_at when header clicked", () => {
    render(
      <IpTable violations={makeViolations()} emptyMessage="Empty" countHeader="Count" actions={() => null} />,
    );
    const lastViolatedTh = screen.getByText(/Last Violation/).closest("th")!;
    // First click: switches to last_violated_at desc (10:30 before 09:15)
    fireEvent.click(lastViolatedTh);
    let rows = screen.getAllByRole("row");
    expect(rows[1].textContent).toContain("192.168.1.100");
    expect(rows[2].textContent).toContain("10.0.0.55");

    // Second click: toggles to asc (09:15 before 10:30)
    fireEvent.click(lastViolatedTh);
    rows = screen.getAllByRole("row");
    expect(rows[1].textContent).toContain("10.0.0.55");
    expect(rows[2].textContent).toContain("192.168.1.100");
  });

  it("shows sort arrow on active column", () => {
    render(
      <IpTable violations={makeViolations()} emptyMessage="Empty" countHeader="Violations" actions={() => null} />,
    );
    // Default sort is violations desc, arrow should contain ↓
    const th = screen.getByText(/^Violations/).closest("th")!;
    expect(th.textContent).toContain("\u2193");
    // Click to toggle to asc
    fireEvent.click(th);
    expect(th.textContent).toContain("\u2191");
  });
});

"use client";

import { useState, useMemo } from "react";
import { useActionState } from "react";
import { banViolationIpAction } from "./actions";
import type { RateLimitViolation } from "@/lib/db";

interface ViolationListProps {
  violations: RateLimitViolation[];
}

type SortField = "violations" | "last_violated_at";
type SortDir = "asc" | "desc";

function formatDateTime(iso: string): string {
  const d = new Date(iso + "Z");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const initialBanState: { success?: boolean; error?: string } | null = null;

export function ViolationList({ violations }: ViolationListProps) {
  const [sortField, setSortField] = useState<SortField>("violations");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [banState, banAction, isBanPending] = useActionState(banViolationIpAction, initialBanState);

  const sorted = useMemo(() => {
    const copy = [...violations];
    copy.sort((a, b) => {
      let cmp = 0;
      if (sortField === "violations") {
        cmp = a.violation_count - b.violation_count;
      } else {
        cmp = a.last_violated_at.localeCompare(b.last_violated_at);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [violations, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const arrow = (field: SortField) =>
    sortField === field ? (sortDir === "desc" ? " \u2193" : " \u2191") : "";

  if (violations.length === 0) {
    return <p className="empty-state">No rate limit violations recorded.</p>;
  }

  return (
    <>
      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>IP Address</th>
              <th className="sortable" onClick={() => toggleSort("violations")}>
                Violations{arrow("violations")}
              </th>
              <th className="sortable" onClick={() => toggleSort("last_violated_at")}>
                Last Violation{arrow("last_violated_at")}
              </th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((v) => (
              <tr key={v.ip_address}>
                <td style={{ fontFamily: "monospace" }}>{v.ip_address}</td>
                <td>{v.violation_count}</td>
                <td>{formatDateTime(v.last_violated_at)}</td>
                <td>
                  <form action={banAction}>
                    <input type="hidden" name="ip_address" value={v.ip_address} />
                    <button type="submit" className="btn btn-sm btn-outline" disabled={isBanPending}>
                      Ban
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {banState?.error && <p className="text-error text-sm">{banState.error}</p>}
      </div>
    </>
  );
}

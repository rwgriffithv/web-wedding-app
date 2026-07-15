"use client";

import { useState, useMemo, type ReactNode } from "react";
import { formatDateTime } from "./format";
import type { RateLimitViolation } from "@/lib/types";

type SortField = "violations" | "last_violated_at";
type SortDir = "asc" | "desc";

interface IpTableProps {
  violations: RateLimitViolation[];
  emptyMessage: string;
  countHeader: string;
  actions: (v: RateLimitViolation) => ReactNode;
}

export function IpTable({ violations, emptyMessage, countHeader, actions }: IpTableProps) {
  const [sortField, setSortField] = useState<SortField>("violations");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

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
    return <p className="empty-state">{emptyMessage}</p>;
  }

  return (
    <div className="admin-table-wrapper">
      <table className="admin-table">
        <thead>
          <tr>
            <th>IP Address</th>
            <th className="sortable" onClick={() => toggleSort("violations")}>
              {countHeader}{arrow("violations")}
            </th>
            <th className="sortable" onClick={() => toggleSort("last_violated_at")}>
              Last Violation{arrow("last_violated_at")}
            </th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((v) => (
            <tr key={v.ip_address}>
              <td style={{ fontFamily: "monospace" }}>{v.ip_address}</td>
              <td>{v.violation_count}</td>
              <td>{formatDateTime(v.last_violated_at)}</td>
              <td>{actions(v)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

"use client";

import { useState } from "react";
import type { SafeUser } from "@/lib/db";

interface ActivityTableProps {
  users: SafeUser[];
}

type SortKey = "last_login_at" | "total_page_views";
type SortDir = "asc" | "desc";

function formatDateTime(iso: string | null): string {
  if (!iso) return "Never";
  const d = new Date(iso + "Z");
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function ActivityTable({ users }: ActivityTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("last_login_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const sorted = [...users].sort((a, b) => {
    if (sortKey === "last_login_at") {
      const aVal = a.last_login_at ?? "";
      const bVal = b.last_login_at ?? "";
      return sortDir === "desc" ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
    }
    return sortDir === "desc" ? b.total_page_views - a.total_page_views : a.total_page_views - b.total_page_views;
  });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === "desc" ? "asc" : "desc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const arrow = (key: SortKey) => sortKey === key ? (sortDir === "desc" ? " \u2193" : " \u2191") : "";

  return (
    <div className="admin-table-wrapper">
      <table className="activity-table">
        <thead>
          <tr>
            <th>Party Name</th>
            <th className="sortable" onClick={() => toggleSort("last_login_at")}>
              Last Login{arrow("last_login_at")}
            </th>
            <th className="sortable" onClick={() => toggleSort("total_page_views")}>
              Total Views{arrow("total_page_views")}
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 && (
            <tr><td colSpan={3} className="empty-state">No party users yet.</td></tr>
          )}
          {sorted.map((u) => (
            <tr key={u.id}>
              <td>{u.display_name}</td>
              <td>{formatDateTime(u.last_login_at)}</td>
              <td>{u.total_page_views}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

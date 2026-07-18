"use client";

import { useState, useMemo } from "react";
import type { SafeUser } from "@/lib/db";
import { formatRelativeTime } from "@/lib/datetime";

interface ActivityTableProps {
  users: SafeUser[];
}

type SortKey = "last_login_at" | "total_page_views";
type SortDir = "asc" | "desc";

export function ActivityTable({ users }: ActivityTableProps) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("last_login_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter(u =>
      u.display_name.toLowerCase().includes(q)
    );
  }, [users, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sortKey === "last_login_at") {
        const aVal = a.last_login_at ?? "";
        const bVal = b.last_login_at ?? "";
        return sortDir === "desc" ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
      }
      return sortDir === "desc" ? b.total_page_views - a.total_page_views : a.total_page_views - b.total_page_views;
    });
  }, [filtered, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === "desc" ? "asc" : "desc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const sortIndicator = (key: SortKey) =>
    sortKey === key ? (sortDir === "asc" ? " ▲" : " ▼") : "";

  return (
    <>
      <div className="mb-2">
        <input
          type="text"
          placeholder="Search by party name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="admin-table-search"
        />
      </div>
      <div className="admin-table-wrapper">
        <table className="activity-table">
          <thead>
            <tr>
              <th>Party Name</th>
              <th onClick={() => toggleSort("last_login_at")} className="sortable">
                Last Login{sortIndicator("last_login_at")}
              </th>
              <th onClick={() => toggleSort("total_page_views")} className="sortable">
                Total Views{sortIndicator("total_page_views")}
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr><td colSpan={3} className="empty-state">{search ? "No parties match your search." : "No party users yet."}</td></tr>
            )}
            {sorted.map((u) => (
              <tr key={u.id}>
                <td>{u.display_name}</td>
                <td>{formatRelativeTime(u.last_login_at)}</td>
                <td>{u.total_page_views}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

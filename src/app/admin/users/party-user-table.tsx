"use client";

import { useState, useMemo } from "react";
import type { SafeUser } from "@/lib/db";

interface PartyUserTableProps {
  partyUsers: SafeUser[];
}

export function PartyUserTable({ partyUsers }: PartyUserTableProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return partyUsers.filter(u =>
      u.display_name.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q)
    );
  }, [partyUsers, search]);

  return (
    <>
      <div className="mb-2">
        <input
          type="text"
          placeholder="Search by name or username..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="admin-table-search"
        />
      </div>
      <div className="admin-list">
        {filtered.length === 0 && (
          <p className="empty-state">{search ? "No party users match your search." : "No party users yet."}</p>
        )}
        {filtered.map((u) => (
          <div key={u.id} className="admin-list-item">
            <div className="item-info">
              <div className="item-title">{u.display_name}</div>
              <div className="item-meta">
                <span className="font-mono">{u.username}</span> &middot; Type: party
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

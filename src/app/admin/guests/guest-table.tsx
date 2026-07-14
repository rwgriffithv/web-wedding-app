"use client";

import { useState, useMemo } from "react";
import { GuestForm } from "./guest-form";
import { GuestRow } from "./guest-list";
import type { Guest, Party } from "@/lib/db";

interface GuestTableProps {
  guests: Guest[];
  parties: Party[];
}

type SortField = "name" | "party";
type SortDir = "asc" | "desc";

export function GuestTable({ guests, parties }: GuestTableProps) {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const partyMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const p of parties) map.set(p.id, p.name);
    return map;
  }, [parties]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let result = guests.filter(g =>
      g.display_name.toLowerCase().includes(q) ||
      (g.party_id !== null && partyMap.get(g.party_id)?.toLowerCase().includes(q))
    );

    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === "name") {
        cmp = a.display_name.localeCompare(b.display_name);
      } else {
        const aName = a.party_id !== null ? partyMap.get(a.party_id) ?? "" : "";
        const bName = b.party_id !== null ? partyMap.get(b.party_id) ?? "" : "";
        cmp = aName.localeCompare(bName);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [guests, search, sortField, sortDir, partyMap]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const sortIndicator = (field: SortField) =>
    sortField === field ? (sortDir === "asc" ? " ▲" : " ▼") : "";

  return (
    <>
      <details className="admin-section" open>
        <summary>Add Guest</summary>
        <div className="admin-section-body">
          <GuestForm parties={parties} />
        </div>
      </details>
      <details className="admin-section" open>
        <summary>Guests ({guests.length})</summary>
        <div className="admin-section-body">
          <div className="mb-2">
            <input
              type="text"
              placeholder="Search by name or party..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="admin-table-search"
            />
          </div>

          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th onClick={() => toggleSort("name")} className="cursor-pointer">
                    Name{sortIndicator("name")}
                  </th>
                  <th onClick={() => toggleSort("party")} className="cursor-pointer">
                    Party{sortIndicator("party")}
                  </th>
                  <th>+1</th>
                  <th>Unexpected</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="empty-state">
                      {search ? "No guests match your search." : "No guests yet."}
                    </td>
                  </tr>
                )}
                {filtered.map(g => (
                  <GuestRow key={g.id} guest={g} parties={parties} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </details>
    </>
  );
}

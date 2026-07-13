"use client";

import { useState, useMemo } from "react";
import { PartyRow } from "./party-row";
import type { Party, Guest } from "@/lib/db";

interface PartyListProps {
  parties: (Party & { guests: Guest[] })[];
}

type SortField = "name" | "invited";
type SortDir = "asc" | "desc";

export function PartyList({ parties }: PartyListProps) {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let result = parties.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.guests.some(g => g.display_name.toLowerCase().includes(q))
    );

    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === "name") {
        cmp = a.name.localeCompare(b.name);
      } else {
        cmp = a.invited - b.invited;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [parties, search, sortField, sortDir]);

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
      <div style={{ marginBottom: "1rem" }}>
        <input
          type="text"
          placeholder="Search by party or guest name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="admin-table-search"
        />
      </div>

      <table className="admin-table">
        <thead>
          <tr>
            <th style={{ width: "2rem" }} />
            <th onClick={() => toggleSort("name")} style={{ cursor: "pointer" }}>
              Name{sortIndicator("name")}
            </th>
            <th>Code</th>
            <th onClick={() => toggleSort("invited")} style={{ cursor: "pointer" }}>
              Invited{sortIndicator("invited")}
            </th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 && (
            <tr>
              <td colSpan={5} className="empty-state">
                {search ? "No parties match your search." : "No parties yet. Create one from the Guests page."}
              </td>
            </tr>
          )}
          {filtered.map(party => (
            <PartyRow key={party.id} party={party} guests={party.guests} />
          ))}
        </tbody>
      </table>
    </>
  );
}

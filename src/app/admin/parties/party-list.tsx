"use client";

import { useState, useMemo } from "react";
import { PartyRow } from "./party-row";
import type { Party, Guest } from "@/lib/db";

interface PartyListProps {
  parties: (Party & { guests: Guest[] })[];
}

export function PartyList({ parties }: PartyListProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return parties;
    const q = search.toLowerCase();
    return parties.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.guests.some(g => g.display_name.toLowerCase().includes(q))
    );
  }, [parties, search]);

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
      {filtered.length === 0 ? (
        <p className="empty-state">
          {search ? "No parties match your search." : "No parties yet. Create one from the Guests page."}
        </p>
      ) : (
        filtered.map(party => (
          <PartyRow key={party.id} party={party} guests={party.guests} />
        ))
      )}
    </>
  );
}

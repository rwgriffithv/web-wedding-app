"use client";

import { useState, useMemo } from "react";
import type { GuestRsvpStatus } from "@/lib/repository/rsvp";

interface RsvpStatusTableProps {
  guests: GuestRsvpStatus[];
}

type SortField = "name" | "party" | "status";
type SortDir = "asc" | "desc";

type StatusFilter = "all" | "yes" | "no" | "no_response";

const STATUS_ORDER = { no_response: 0, yes: 1, no: 2 } as const;

function getStatus(guest: GuestRsvpStatus): "yes" | "no" | "no_response" {
  if (guest.attending === null) return "no_response";
  return guest.attending === 1 ? "yes" : "no";
}

function getStatusLabel(status: "yes" | "no" | "no_response"): string {
  switch (status) {
    case "yes": return "Yes";
    case "no": return "No";
    case "no_response": return "No response";
  }
}

export function RsvpStatusTable({ guests }: RsvpStatusTableProps) {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let result = guests.filter(g => {
      const matchesSearch = g.display_name.toLowerCase().includes(q) ||
        g.party_name.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || getStatus(g) === statusFilter;
      return matchesSearch && matchesStatus;
    });

    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === "name") {
        cmp = a.display_name.localeCompare(b.display_name);
      } else if (sortField === "party") {
        cmp = a.party_name.localeCompare(b.party_name);
      } else {
        cmp = STATUS_ORDER[getStatus(a)] - STATUS_ORDER[getStatus(b)];
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [guests, search, sortField, sortDir, statusFilter]);

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

  const counts = useMemo(() => {
    let yes = 0, no = 0, noResponse = 0;
    for (const g of guests) {
      const s = getStatus(g);
      if (s === "yes") yes++;
      else if (s === "no") no++;
      else noResponse++;
    }
    return { yes, no, noResponse, total: guests.length };
  }, [guests]);

  return (
    <>
      <div className="flex-row gap-2 mb-2 items-center flex-wrap">
        <input
          type="text"
          placeholder="Search by name or party..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="admin-table-search"
        />
        <div className="flex-row gap-1" style={{ fontSize: "0.8rem" }}>
          <button
            className={`btn btn-sm ${statusFilter === "all" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setStatusFilter("all")}
          >
            All ({counts.total})
          </button>
          <button
            className={`btn btn-sm ${statusFilter === "yes" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setStatusFilter("yes")}
          >
            Yes ({counts.yes})
          </button>
          <button
            className={`btn btn-sm ${statusFilter === "no" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setStatusFilter("no")}
          >
            No ({counts.no})
          </button>
          <button
            className={`btn btn-sm ${statusFilter === "no_response" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setStatusFilter("no_response")}
          >
            No response ({counts.noResponse})
          </button>
        </div>
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
              <th onClick={() => toggleSort("status")} className="cursor-pointer">
                Status{sortIndicator("status")}
              </th>
              <th>Plus One</th>
              <th>Responded</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="empty-state">
                  {search || statusFilter !== "all" ? "No guests match your filters." : "No guests yet."}
                </td>
              </tr>
            )}
            {filtered.map(g => {
              const status = getStatus(g);
              return (
                <tr key={g.guest_id}>
                  <td>{g.display_name}</td>
                  <td>{g.party_name}</td>
                  <td>
                    <span className={`badge ${status === "yes" ? "badge-yes" : status === "no" ? "badge-no" : "badge-guest"}`}>
                      {getStatusLabel(status)}
                    </span>
                  </td>
                  <td>{g.plus_one_name || "\u2014"}</td>
                  <td>{g.responded_at ? new Date(`${g.responded_at}Z`).toLocaleDateString() : "\u2014"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

"use client";

import { useState, useMemo } from "react";
import { UserList } from "./user-list";
import type { SafeUser } from "@/lib/db";

interface UserTableProps {
  users: SafeUser[];
  primaryAdminUsername: string;
}

export function UserTable({ users, primaryAdminUsername }: UserTableProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter(u =>
      u.display_name.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      u.type.toLowerCase().includes(q)
    );
  }, [users, search]);

  return (
    <>
      <div className="mb-2">
        <input
          type="text"
          placeholder="Search by name, username, or type..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="admin-table-search"
        />
      </div>
      <div className="admin-list">
        {filtered.length === 0 && (
          <p className="empty-state">{search ? "No users match your search." : "No users yet."}</p>
        )}
        {filtered.map((u) => (
          <UserList key={u.id} user={u} isPrimaryAdmin={u.type === "admin" && u.username === primaryAdminUsername} />
        ))}
      </div>
    </>
  );
}

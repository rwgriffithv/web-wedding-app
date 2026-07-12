"use client";

import { useActionState } from "react";
import { updateUser, removeUser } from "./actions";
import type { SafeUser } from "@/lib/db";

interface UserListProps {
  user: SafeUser;
  isPrimaryAdmin: boolean;
}

const initialState = null as { success?: boolean; error?: string } | null;

export function UserList({ user, isPrimaryAdmin }: UserListProps) {
  const [state, dispatch, isPending] = useActionState(updateUser, initialState);
  const [, deleteDispatch, deletePending] = useActionState(removeUser, initialState);

  return (
    <div className="admin-list-item">
      <div className="item-info">
        <div className="item-title">{user.display_name}</div>
        <div className="item-meta">
          Username: {user.username} &middot; Type: {user.type}
          {isPrimaryAdmin && " (primary admin)"}
        </div>
      </div>
      {!isPrimaryAdmin && (
        <div className="flex-row gap-1 items-end flex-wrap">
          <form action={dispatch} className="flex-row gap-1 items-end flex-wrap">
            <input type="hidden" name="user_id" value={user.id} />
            <div>
              <input name="username" defaultValue={user.username} placeholder="Username" aria-label="Username" className="table-inline-input" style={{ width: "100px" }} />
            </div>
            <div>
              <input name="password" placeholder="New password" type="password" minLength={1} aria-label="New password" className="table-inline-input" style={{ width: "100px" }} />
            </div>
            <div>
              <select name="type" defaultValue={user.type} aria-label="User type" className="table-inline-select">
                <option value="admin">Admin</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            <button type="submit" className="btn btn-sm btn-primary" disabled={isPending}>{isPending ? "Saving..." : "Save"}</button>
            {state?.success && <span className="text-success text-sm" role="status">Saved</span>}
            {state?.error && <span className="text-error text-sm" role="alert">{state.error}</span>}
          </form>
          <form action={deleteDispatch} onSubmit={(e) => { if (!confirm("Delete this user?")) e.preventDefault(); }}>
            <input type="hidden" name="user_id" value={user.id} />
            <button type="submit" className="btn btn-sm btn-danger" disabled={deletePending}>
              {deletePending ? "..." : "Delete"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

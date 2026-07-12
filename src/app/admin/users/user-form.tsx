"use client";

import { useActionState } from "react";
import { addUser } from "./actions";

const initialState = null as { success?: boolean; error?: string } | null;

export function UserForm() {
  const [state, dispatch, isPending] = useActionState(addUser, initialState);

  return (
    <form action={dispatch} className="admin-form">
      <div className="form-group">
        <label htmlFor="display_name">Display Name</label>
        <input id="display_name" name="display_name" type="text" required />
      </div>
      <div className="form-group">
        <label htmlFor="username">Username</label>
        <input id="username" name="username" type="text" required />
      </div>
      <div className="form-group">
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" required />
      </div>
      <div className="form-group">
        <label htmlFor="type">User Type</label>
        <select id="type" name="type" required>
          <option value="admin">Admin</option>
          <option value="viewer">Viewer</option>
        </select>
      </div>
      {state?.success && <p className="text-success text-sm mb-1" role="status">User added.</p>}
      {state?.error && <p className="text-error text-sm mb-1" role="alert">{state.error}</p>}
      <button type="submit" className="btn btn-primary" disabled={isPending}>{isPending ? "Adding..." : "Add User"}</button>
    </form>
  );
}

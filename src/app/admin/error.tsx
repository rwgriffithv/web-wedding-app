"use client";

import Link from "next/link";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error(error);
  return (
    <div className="admin-layout">
      <aside className="admin-sidebar" aria-label="Admin navigation">
        <h2>Admin Panel</h2>
        <Link href="/admin" style={{ color: "var(--color-sidebar-text)" }}>Dashboard</Link>
      </aside>
      <main className="admin-main" style={{ textAlign: "center", paddingTop: "4rem" }}>
        <h1>Something went wrong</h1>
        <p style={{ color: "var(--color-muted)", margin: "1rem 0 2rem" }}>
          An unexpected error occurred in the admin panel.
        </p>
        <button onClick={() => reset()} className="btn btn-primary">
          Try again
        </button>
      </main>
    </div>
  );
}

"use client";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <h2>Admin Panel</h2>
        <a href="/admin" style={{ color: "var(--color-sidebar-text)" }}>Dashboard</a>
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
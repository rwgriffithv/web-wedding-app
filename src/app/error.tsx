"use client";

export default function ErrorPage({ reset, error }: { error: Error; reset: () => void }) {
  console.error(error);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "2rem", textAlign: "center" }}>
      <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>Something went wrong</h1>
      <p style={{ color: "var(--color-muted)", marginBottom: "2rem" }}>An unexpected error occurred.</p>
      <button onClick={reset} className="btn btn-primary">Try again</button>
    </div>
  );
}

"use client";

export default function ErrorPage({ reset, error }: { error: Error & { digest?: string }; reset: () => void }) {
  console.error(error);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "2rem", textAlign: "center" }}>
      <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>Something went wrong</h1>
      <p style={{ color: "var(--color-muted)", marginBottom: "2rem" }}>An unexpected error occurred.</p>
      {error.digest && (
        <p style={{ color: "var(--color-muted)", fontSize: "0.75rem", marginBottom: "2rem" }}>
          Error code: {error.digest}
        </p>
      )}
      <button onClick={reset} className="btn btn-primary">Try again</button>
    </div>
  );
}

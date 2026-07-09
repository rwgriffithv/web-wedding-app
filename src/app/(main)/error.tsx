"use client";

export default function MainError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="page-content" style={{ textAlign: "center", paddingTop: "4rem" }}>
      <h1>Something went wrong</h1>
      <p style={{ color: "var(--color-muted)", margin: "1rem 0 2rem" }}>
        Please try again or go back to the home page.
      </p>
      <button onClick={() => reset()} className="btn btn-primary">
        Try again
      </button>
    </div>
  );
}
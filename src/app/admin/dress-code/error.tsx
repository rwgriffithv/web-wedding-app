"use client";

export default function DressCodeError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error(error);
  return (
    <div className="page-content">
      <h1>Something went wrong</h1>
      <p style={{ color: "var(--color-muted)", marginBottom: "1rem" }}>
        An unexpected error occurred. Please try again.
      </p>
      <button className="btn btn-primary" onClick={() => reset()}>
        Try again
      </button>
    </div>
  );
}

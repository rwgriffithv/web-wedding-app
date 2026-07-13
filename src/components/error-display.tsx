"use client";

interface ErrorDisplayProps {
  error: Error & { digest?: string };
  reset: () => void;
  message?: string;
  className?: string;
}

export function ErrorDisplay({ error, reset, message = "An unexpected error occurred. Please try again.", className = "page-content" }: ErrorDisplayProps) {
  console.error(error);
  return (
    <div className={className} style={{ textAlign: "center", paddingTop: "4rem" }}>
      <h1>Something went wrong</h1>
      <p style={{ color: "var(--color-muted)", marginBottom: "1rem" }}>{message}</p>
      {error.digest && (
        <p style={{ color: "var(--color-muted)", fontSize: "0.75rem", marginBottom: "1rem" }}>
          Error code: {error.digest}
        </p>
      )}
      <button className="btn btn-primary" onClick={() => reset()}>Try again</button>
    </div>
  );
}

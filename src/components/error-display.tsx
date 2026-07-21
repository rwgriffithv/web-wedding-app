"use client";

import { useEffect } from "react";
import { logError } from "@/lib/logger";

interface ErrorDisplayProps {
  error: Error & { digest?: string };
  reset: () => void;
  message?: string;
  className?: string;
}

export function ErrorDisplay({ error, reset, message = "An unexpected error occurred. Please try again.", className = "page-content" }: ErrorDisplayProps) {
  useEffect(() => { logError("ErrorDisplay", error); }, [error]);
  return (
    <div className={`${className} text-center pt-16`}>
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

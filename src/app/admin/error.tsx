"use client";

import { ErrorDisplay } from "@/components/error-display";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorDisplay error={error} reset={reset} message="An unexpected error occurred in the admin panel." />;
}

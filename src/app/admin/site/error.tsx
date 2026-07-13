"use client";

import { ErrorDisplay } from "@/components/error-display";

export default function SiteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorDisplay error={error} reset={reset} />;
}

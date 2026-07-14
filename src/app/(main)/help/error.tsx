"use client";

import { ErrorDisplay } from "@/components/error-display";

export default function HelpError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorDisplay error={error} reset={reset} message="Please try again or go back to the home page." />;
}

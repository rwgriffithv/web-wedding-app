"use client";

import { ErrorDisplay } from "@/components/error-display";

export default function ErrorPage(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorDisplay {...props} />;
}

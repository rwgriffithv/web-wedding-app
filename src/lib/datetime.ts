/**
 * Format a UTC ISO datetime string to an absolute locale string.
 * Assumes the input is UTC (appends "Z" if missing).
 */
export function formatUtcDateTime(iso: string): string {
  const d = new Date(iso + "Z");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Format a UTC ISO datetime string to a relative time string ("Just now", "2h ago", etc.).
 * Returns "Never" for null/undefined values.
 * Falls back to absolute date for entries older than 7 days.
 */
export function formatRelativeTime(iso: string | null): string {
  if (!iso) return "Never";
  const d = new Date(iso + "Z");
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

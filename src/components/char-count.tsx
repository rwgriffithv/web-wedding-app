"use client";

interface CharCountProps {
  current: number;
  max: number;
}

export function CharCount({ current, max }: CharCountProps) {
  // Intentionally allows negative values to show overflow (e.g. "-5 characters remaining")
  const remaining = max - current;
  return (
    <p className={`text-xs mt-0_25 ${remaining < 0 ? "text-error" : "text-muted"}`} aria-live="polite">
      {remaining} characters remaining
    </p>
  );
}

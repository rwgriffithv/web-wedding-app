"use client";

interface CharCountProps {
  current: number;
  max: number;
}

export function CharCount({ current, max }: CharCountProps) {
  const remaining = max - current;
  return (
    <p className={`text-xs mt-0_25 ${remaining < 0 ? "text-error" : "text-muted"}`} aria-live="off">
      {remaining} characters remaining
    </p>
  );
}

export function CharCount({ current, max }: { current: number; max: number }) {
  const remaining = max - current;
  return (
    <p className={`text-xs mt-0_25 ${remaining < 0 ? "text-error" : "text-muted"}`} aria-live="polite">
      {remaining} characters remaining
    </p>
  );
}

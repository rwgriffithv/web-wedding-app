"use client";

import { useState, useEffect, useRef } from "react";

interface TimeDelta {
  total: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function calcTimeDelta(targetMs: number): TimeDelta {
  const total = targetMs - Date.now();
  const abs = Math.abs(total);
  return {
    total,
    days: Math.floor(abs / 86_400_000),
    hours: Math.floor((abs % 86_400_000) / 3_600_000),
    minutes: Math.floor((abs % 3_600_000) / 60_000),
    seconds: Math.floor((abs % 60_000) / 1_000),
  };
}

function Digit({ value, label }: { value: number; label: string }) {
  return (
    <span className="countdown-segment">
      <span className="countdown-digit">{String(value).padStart(2, "0")}</span>
      <span className="countdown-label">{label}</span>
    </span>
  );
}

export function CountdownTimer({ targetDate }: { targetDate: string }) {
  const targetMs = useRef(new Date(targetDate).getTime()).current;
  const isValid = !Number.isNaN(targetMs);
  const [delta, setDelta] = useState<TimeDelta | null>(null);

  useEffect(() => {
    if (!isValid) return;
    setDelta(calcTimeDelta(targetMs));
    const id = setInterval(() => setDelta(calcTimeDelta(targetMs)), 1000);
    return () => clearInterval(id);
  }, [targetMs, isValid]);

  if (!isValid) {
    return <div className="countdown" suppressHydrationWarning><span className="countdown-prefix">T-</span><span className="countdown-digit">--</span></div>;
  }

  if (!delta) {
    return <div className="countdown" suppressHydrationWarning><span className="countdown-prefix">T-</span><span className="countdown-digit">--</span></div>;
  }

  const prefix = delta.total > 0 ? "T\u2212" : "T+";

  return (
    <div className="countdown" suppressHydrationWarning>
      <span className="countdown-prefix" suppressHydrationWarning>{prefix}</span>
      <Digit value={delta.days} label="days" />
      <Digit value={delta.hours} label="hrs" />
      <Digit value={delta.minutes} label="min" />
      <Digit value={delta.seconds} label="sec" />
    </div>
  );
}

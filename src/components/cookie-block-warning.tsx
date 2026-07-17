"use client";

import { useEffect, useState } from "react";

import { COOKIE_HEALTH_KEY } from "@/lib/constants";

export function CookieBlockWarning() {
  const [warning, setWarning] = useState(false);

  useEffect(() => {
    try {
      if (window.location.pathname !== "/login") return;

      const raw = localStorage.getItem(COOKIE_HEALTH_KEY);
      if (raw && Number(raw) > Date.now()) {
        setWarning(true);
      }
    } catch {
      /* localStorage unavailable — skip indicator */
    }
  }, []);

  if (!warning) return null;

  return (
    <div className="session-warning" role="alert">
      <p>
        Your browser may be blocking cookies. Please disable
        privacy extensions for this site, then log in again.
      </p>
    </div>
  );
}

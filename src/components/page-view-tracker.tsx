"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackPageView } from "./track-page-view";
import { PV_UNTIL_KEY } from "@/lib/constants";

function isTrackingActive(): boolean {
  try {
    const raw = localStorage.getItem(PV_UNTIL_KEY);
    if (!raw) return false;
    return Date.now() < parseInt(raw, 10);
  } catch {
    return false;
  }
}

function markTrackingActive(debounceMinutes: number): void {
  try {
    localStorage.setItem(PV_UNTIL_KEY, String(Date.now() + debounceMinutes * 60_000));
  } catch {
    /* localStorage unavailable — skip */
  }
}

export function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (isTrackingActive()) return;
    trackPageView().then(({ debounceMinutes }) => {
      markTrackingActive(debounceMinutes);
    });
  }, [pathname]);

  return null;
}

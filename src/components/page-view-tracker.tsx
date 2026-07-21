"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackPageView } from "./track-page-view";
import { VIEW_DEBOUNCE_UNTIL_KEY } from "@/lib/constants";
import { isExpired, setExpirationFromNow } from "@/lib/localstorage-cache";

export function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!isExpired(VIEW_DEBOUNCE_UNTIL_KEY)) return;
    trackPageView().then(({ debounceMinutes }) => {
      setExpirationFromNow(VIEW_DEBOUNCE_UNTIL_KEY, debounceMinutes * 60_000);
    });
  }, [pathname]);

  return null;
}

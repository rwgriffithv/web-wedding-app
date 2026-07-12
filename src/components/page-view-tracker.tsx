"use client";

import { useEffect } from "react";
import { trackPageView } from "./track-page-view";

export function PageViewTracker() {
  useEffect(() => {
    trackPageView();
  }, []);

  return null;
}

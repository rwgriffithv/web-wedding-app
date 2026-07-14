"use client";

import { useRef, useState, useEffect, useCallback } from "react";

interface BannerTextProps {
  text: string;
}

export function BannerText({ text }: BannerTextProps) {
  const trackRef = useRef<HTMLSpanElement>(null);
  const [overflowing, setOverflowing] = useState(false);

  const checkOverflow = useCallback(() => {
    const el = trackRef.current;
    if (el) {
      setOverflowing(el.scrollWidth > el.clientWidth);
    }
  }, []);

  useEffect(() => {
    checkOverflow();
    window.addEventListener("resize", checkOverflow);
    return () => window.removeEventListener("resize", checkOverflow);
  }, [checkOverflow]);

  return (
    <div className="banner" role="status">
      <span className="banner-edge" aria-hidden="true">!!</span>
      <span className="banner-track" ref={trackRef}>
        {overflowing ? (
          <span className="banner-inner banner-scrolling">
            <span>{text}</span>
            <span aria-hidden="true">{text}</span>
          </span>
        ) : (
          <span className="banner-text-static">{text}</span>
        )}
      </span>
      <span className="banner-edge" aria-hidden="true">!!</span>
    </div>
  );
}

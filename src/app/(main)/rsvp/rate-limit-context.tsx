"use client";

import { createContext, useContext } from "react";
import type { CooldownProps } from "@/lib/use-rate-limit-cooldown";

export const RateLimitContext = createContext<CooldownProps | null>(null);

export function useSharedCooldown(): CooldownProps {
  const ctx = useContext(RateLimitContext);
  if (!ctx) throw new Error("useSharedCooldown must be used within a RateLimitContext provider");
  return ctx;
}

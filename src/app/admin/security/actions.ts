"use server";

import { revalidatePath } from "next/cache";
import { requireSession, validateSessionInDb } from "@/lib/auth";
import { getRequiredString, getOptionalString, getInt } from "@/lib/form-data";
import { logError } from "@/lib/logger";
import { setConfigs } from "@/lib/repository/site-config";
import { banIp, unbanIp, clearViolations, getBannedIpById } from "@/lib/repository/ip-bans";
import { revokeSessionsByIpBan, unrevokeSessionsByIpBan } from "@/lib/session-revocation";
import {
  AUTO_BAN_LOGIN_THRESHOLD_KEY,
  AUTO_BAN_WINDOW_SECONDS_KEY,
  LOGIN_RATE_LIMIT_MAX_KEY,
  LOGIN_RATE_LIMIT_WINDOW_SECONDS_KEY,
  SUSPICIOUS_IP_THRESHOLD_KEY,
  SESSION_MAX_HOURS_KEY,
  PAGE_VIEW_DEBOUNCE_MINUTES_KEY,
} from "@/lib/constants";

interface SecurityState { success?: boolean; error?: string }

const IP_V4 = /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/;
const IP_V6 = /^[0-9a-fA-F]{0,4}(?::[0-9a-fA-F]{0,4}){2,7}$/;
const MAX_REASON_LENGTH = 500;

function isValidIp(ip: string): boolean {
  return IP_V4.test(ip) || IP_V6.test(ip);
}

async function banIpCommon(ip: string, reason: string): Promise<SecurityState> {
  const inserted = banIp(ip, reason.slice(0, MAX_REASON_LENGTH));
  if (!inserted) return { success: false, error: "This IP is already banned." };

  revokeSessionsByIpBan(ip);
  revalidatePath("/admin/security");
  return { success: true };
}

export async function banIpAction(_prevState: SecurityState | null, formData: FormData): Promise<SecurityState> {
  const session = await requireSession("admin");
  if (!session) return { success: false, error: "Unauthorized" };
  if (!(await validateSessionInDb(session))) return { success: false, error: "Session expired" };

  try {
    const ip = getOptionalString(formData, "ip_address");
    const reason = getOptionalString(formData, "reason") || "manual";

    if (!ip) return { success: false, error: "IP address is required." };

    if (!isValidIp(ip)) {
      return { success: false, error: "Invalid IP address format." };
    }

    return await banIpCommon(ip, reason);
  } catch (error) {
    logError("Security", error);
    return { success: false, error: "Failed to ban IP." };
  }
}

export async function unbanIpAction(_prevState: SecurityState | null, formData: FormData): Promise<SecurityState> {
  const session = await requireSession("admin");
  if (!session) return { success: false, error: "Unauthorized" };
  if (!(await validateSessionInDb(session))) return { success: false, error: "Session expired" };

  try {
    const id = getInt(formData, "id");
    if (id === null) return { success: false, error: "Invalid ID." };
    const unbannedIp = getBannedIpById(id);
    if (!unbannedIp) return { success: false, error: "Ban not found." };
    unbanIp(id);
    unrevokeSessionsByIpBan(unbannedIp);
    revalidatePath("/admin/security");
    return { success: true };
  } catch (error) {
    logError("Security", error);
    return { success: false, error: "Failed to unban IP." };
  }
}

export async function banViolationIpAction(_prevState: SecurityState | null, formData: FormData): Promise<SecurityState> {
  const session = await requireSession("admin");
  if (!session) return { success: false, error: "Unauthorized" };
  if (!(await validateSessionInDb(session))) return { success: false, error: "Session expired" };

  try {
    const ip = getOptionalString(formData, "ip_address");
    if (!ip) return { success: false, error: "IP address is required." };

    if (!isValidIp(ip)) {
      return { success: false, error: "Invalid IP address format." };
    }

    return await banIpCommon(ip, "manual");
  } catch (error) {
    logError("Security", error);
    return { success: false, error: "Failed to ban IP." };
  }
}

export async function saveSecuritySettings(prevState: SecurityState | null, formData: FormData): Promise<SecurityState> {
  const session = await requireSession("admin");
  if (!session) return { success: false, error: "Unauthorized" };
  if (!(await validateSessionInDb(session))) return { success: false, error: "Session expired" };

  try {
    const fields = [
      { key: AUTO_BAN_LOGIN_THRESHOLD_KEY, label: "Auto-Ban Threshold", min: 1, max: 100 },
      { key: AUTO_BAN_WINDOW_SECONDS_KEY, label: "Auto-Ban Window", min: 60, max: 86400 },
      { key: LOGIN_RATE_LIMIT_MAX_KEY, label: "Rate Limit Max Attempts", min: 1, max: 1000 },
      { key: LOGIN_RATE_LIMIT_WINDOW_SECONDS_KEY, label: "Rate Limit Window", min: 1, max: 1000 },
      { key: SESSION_MAX_HOURS_KEY, label: "Session Expiry", min: 1, max: 24 },
      { key: PAGE_VIEW_DEBOUNCE_MINUTES_KEY, label: "Page View Debounce", min: 0, max: 1440 },
      { key: SUSPICIOUS_IP_THRESHOLD_KEY, label: "Suspicious IP Threshold", min: 1, max: 100 },
    ] as const;

    const parsed: Record<string, number> = {};
    for (const { key, label } of fields) {
      const raw = getRequiredString(formData, key);
      if (!raw) return { success: false, error: `${label} is required.` };
      const n = parseInt(raw, 10);
      if (!Number.isFinite(n)) return { success: false, error: `${label} must be a whole number.` };
      parsed[key] = n;
    }
    for (const { key, label, min, max } of fields) {
      const n = parsed[key];
      if (n < min || n > max) {
        return { success: false, error: `${label} must be between ${min} and ${max}.` };
      }
    }

    setConfigs([
      [AUTO_BAN_LOGIN_THRESHOLD_KEY, String(parsed[AUTO_BAN_LOGIN_THRESHOLD_KEY])],
      [AUTO_BAN_WINDOW_SECONDS_KEY, String(parsed[AUTO_BAN_WINDOW_SECONDS_KEY])],
      [LOGIN_RATE_LIMIT_MAX_KEY, String(parsed[LOGIN_RATE_LIMIT_MAX_KEY])],
      [LOGIN_RATE_LIMIT_WINDOW_SECONDS_KEY, String(parsed[LOGIN_RATE_LIMIT_WINDOW_SECONDS_KEY])],
      [SESSION_MAX_HOURS_KEY, String(parsed[SESSION_MAX_HOURS_KEY])],
      [PAGE_VIEW_DEBOUNCE_MINUTES_KEY, String(parsed[PAGE_VIEW_DEBOUNCE_MINUTES_KEY])],
      [SUSPICIOUS_IP_THRESHOLD_KEY, String(parsed[SUSPICIOUS_IP_THRESHOLD_KEY])],
    ]);

    revalidatePath("/admin/security");
    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    logError("Security", error);
    return { success: false, error: "Failed to save security settings." };
  }
}

export async function clearViolationsAction(_prevState: SecurityState | null, formData: FormData): Promise<SecurityState> {
  const session = await requireSession("admin");
  if (!session) return { success: false, error: "Unauthorized" };
  if (!(await validateSessionInDb(session))) return { success: false, error: "Session expired" };

  try {
    const ip = getOptionalString(formData, "ip_address");
    if (!ip) return { success: false, error: "IP address is required." };

    if (!isValidIp(ip)) {
      return { success: false, error: "Invalid IP address format." };
    }

    clearViolations(ip);
    revalidatePath("/admin/security");
    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    logError("Security", error);
    return { success: false, error: "Failed to clear violations." };
  }
}

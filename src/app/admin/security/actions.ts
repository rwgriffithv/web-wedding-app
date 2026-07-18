"use server";

import { revalidatePath } from "next/cache";
import { requireSession, validateSessionInDb } from "@/lib/auth";
import { getString, getInt } from "@/lib/form-data";
import { setConfig } from "@/lib/repository/site-config";
import { banIp, unbanIp, isIpBanned, clearViolations, getBannedIpById } from "@/lib/repository/ip-bans";
import { revokeSessionsByIpBan, unrevokeSessionsByIpBan } from "@/lib/session-revocation";

interface SecurityState { success?: boolean; error?: string }

const IP_V4 = /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/;
const IP_V6 = /^[0-9a-fA-F]{0,4}(?::[0-9a-fA-F]{0,4}){2,7}$/;
const MAX_REASON_LENGTH = 500;

function isValidIp(ip: string): boolean {
  return IP_V4.test(ip) || IP_V6.test(ip);
}

async function banIpCommon(ip: string, reason: string): Promise<SecurityState> {
  if (isIpBanned(ip)) return { success: false, error: "This IP is already banned." };

  try {
    banIp(ip, reason.slice(0, MAX_REASON_LENGTH));
  } catch (error) {
    console.error(error);
    return { success: false, error: "This IP is already banned." };
  }
  revokeSessionsByIpBan(ip);
  revalidatePath("/admin/security");
  return { success: true };
}

export async function banIpAction(_prevState: SecurityState | null, formData: FormData): Promise<SecurityState> {
  const session = await requireSession("admin");
  if (!session) return { success: false, error: "Unauthorized" };
  if (!(await validateSessionInDb(session))) return { success: false, error: "Session expired" };

  try {
    const ip = getString(formData, "ip_address") ?? "";
    const reason = getString(formData, "reason") ?? "manual";

    if (!ip) return { success: false, error: "IP address is required." };

    if (!isValidIp(ip)) {
      return { success: false, error: "Invalid IP address format." };
    }

    return await banIpCommon(ip, reason);
  } catch (error) {
    console.error(error);
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
    console.error(error);
    return { success: false, error: "Failed to unban IP." };
  }
}

export async function banViolationIpAction(_prevState: SecurityState | null, formData: FormData): Promise<SecurityState> {
  const session = await requireSession("admin");
  if (!session) return { success: false, error: "Unauthorized" };
  if (!(await validateSessionInDb(session))) return { success: false, error: "Session expired" };

  try {
    const ip = getString(formData, "ip_address") ?? "";
    if (!ip) return { success: false, error: "IP address is required." };

    if (!isValidIp(ip)) {
      return { success: false, error: "Invalid IP address format." };
    }

    return await banIpCommon(ip, "manual");
  } catch (error) {
    console.error(error);
    return { success: false, error: "Failed to ban IP." };
  }
}

export async function saveSecuritySettings(prevState: SecurityState | null, formData: FormData): Promise<SecurityState> {
  const session = await requireSession("admin");
  if (!session) return { success: false, error: "Unauthorized" };
  if (!(await validateSessionInDb(session))) return { success: false, error: "Session expired" };

  try {
    const fields = [
      { key: "auto_ban_login_threshold", label: "Auto-Ban Threshold", min: 1, max: 100 },
      { key: "auto_ban_window_seconds", label: "Auto-Ban Window", min: 60, max: 86400 },
      { key: "rate_limit_max_attempts", label: "Rate Limit Max Attempts", min: 1, max: 1000 },
      { key: "rate_limit_window_seconds", label: "Rate Limit Window", min: 1, max: 1000 },
      { key: "session_max_hours", label: "Session Expiry", min: 1, max: 24 },
      { key: "page_view_debounce_minutes", label: "Page View Debounce", min: 0, max: 1440 },
      { key: "suspicious_ip_threshold", label: "Suspicious IP Threshold", min: 1, max: 100 },
    ] as const;

    const parsed: Record<string, number> = {};
    for (const { key, label } of fields) {
      const raw = getString(formData, key);
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

    setConfig("auto_ban_login_threshold", String(parsed.auto_ban_login_threshold));
    setConfig("auto_ban_window_seconds", String(parsed.auto_ban_window_seconds));
    setConfig("rate_limit_max_attempts", String(parsed.rate_limit_max_attempts));
    setConfig("rate_limit_window_seconds", String(parsed.rate_limit_window_seconds));
    setConfig("session_max_hours", String(parsed.session_max_hours));
    setConfig("page_view_debounce_minutes", String(parsed.page_view_debounce_minutes));
    setConfig("suspicious_ip_threshold", String(parsed.suspicious_ip_threshold));

    revalidatePath("/admin/security");
    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Failed to save security settings." };
  }
}

export async function clearViolationsAction(_prevState: SecurityState | null, formData: FormData): Promise<SecurityState> {
  const session = await requireSession("admin");
  if (!session) return { success: false, error: "Unauthorized" };
  if (!(await validateSessionInDb(session))) return { success: false, error: "Session expired" };

  try {
    const ip = getString(formData, "ip_address") ?? "";
    if (!ip) return { success: false, error: "IP address is required." };

    if (!isValidIp(ip)) {
      return { success: false, error: "Invalid IP address format." };
    }

    clearViolations(ip);
    revalidatePath("/admin/security");
    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Failed to clear violations." };
  }
}

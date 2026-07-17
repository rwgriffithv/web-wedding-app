"use server";

import { revalidatePath } from "next/cache";
import { requireAdminSessionOrNull, validateSessionInDb } from "@/lib/auth";
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

export async function saveAutoBanSettings(prevState: SecurityState | null, formData: FormData): Promise<SecurityState> {
  const session = await requireAdminSessionOrNull();
  if (!session) return { success: false, error: "Unauthorized" };
  if (!(await validateSessionInDb(session))) return { success: false, error: "Session expired" };

  try {
    const threshold = getString(formData, "auto_ban_login_threshold") ?? "";
    const windowSeconds = getString(formData, "auto_ban_window_seconds") ?? "";

    const thresholdNum = parseInt(threshold, 10);
    const windowNum = parseInt(windowSeconds, 10);

    if (!Number.isFinite(thresholdNum) || thresholdNum < 1 || thresholdNum > 100) {
      return { success: false, error: "Threshold must be a number between 1 and 100." };
    }
    if (!Number.isFinite(windowNum) || windowNum < 60 || windowNum > 86400) {
      return { success: false, error: "Window must be between 60 and 86400 seconds." };
    }

    setConfig("auto_ban_login_threshold", String(thresholdNum));
    setConfig("auto_ban_window_seconds", String(windowNum));
    revalidatePath("/admin/security");
    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Failed to save auto-ban settings." };
  }
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
  const session = await requireAdminSessionOrNull();
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
  const session = await requireAdminSessionOrNull();
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
  const session = await requireAdminSessionOrNull();
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

export async function saveSessionSettings(prevState: SecurityState | null, formData: FormData): Promise<SecurityState> {
  const session = await requireAdminSessionOrNull();
  if (!session) return { success: false, error: "Unauthorized" };
  if (!(await validateSessionInDb(session))) return { success: false, error: "Session expired" };

  try {
    const sessionMaxHours = getString(formData, "session_max_hours") ?? "";
    const pageViewDebounceMinutes = getString(formData, "page_view_debounce_minutes") ?? "";

    const hoursNum = parseInt(sessionMaxHours, 10);
    const minutesNum = parseInt(pageViewDebounceMinutes, 10);

    if (!Number.isFinite(hoursNum) || hoursNum < 1 || hoursNum > 24) {
      return { success: false, error: "Session expiry must be between 1 and 24 hours." };
    }
    if (!Number.isFinite(minutesNum) || minutesNum < 1 || minutesNum > 1440) {
      return { success: false, error: "Page view debounce must be between 1 and 1440 minutes." };
    }

    setConfig("session_max_hours", String(hoursNum));
    setConfig("page_view_debounce_minutes", String(minutesNum));
    revalidatePath("/admin/security");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Failed to save session settings." };
  }
}

export async function saveSuspiciousSettings(prevState: SecurityState | null, formData: FormData): Promise<SecurityState> {
  const session = await requireAdminSessionOrNull();
  if (!session) return { success: false, error: "Unauthorized" };
  if (!(await validateSessionInDb(session))) return { success: false, error: "Session expired" };

  try {
    const threshold = getString(formData, "suspicious_ip_threshold") ?? "";
    const thresholdNum = parseInt(threshold, 10);

    if (!Number.isFinite(thresholdNum) || thresholdNum < 1 || thresholdNum > 100) {
      return { success: false, error: "Threshold must be a number between 1 and 100." };
    }

    setConfig("suspicious_ip_threshold", String(thresholdNum));
    revalidatePath("/admin/security");
    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Failed to save suspicious IP settings." };
  }
}

export async function clearViolationsAction(_prevState: SecurityState | null, formData: FormData): Promise<SecurityState> {
  const session = await requireAdminSessionOrNull();
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

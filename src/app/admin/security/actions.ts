"use server";

import { revalidatePath } from "next/cache";
import { parseAdminSession, validateSessionForMutation } from "@/lib/auth";
import { getString } from "@/lib/form-data";
import { setConfig } from "@/lib/repository/site-config";
import { banIp, unbanIp, isIpBanned, clearViolations } from "@/lib/repository/ip-bans";

interface SecurityState { success?: boolean; error?: string }

export async function saveAutoBanSettings(prevState: SecurityState | null, formData: FormData): Promise<SecurityState> {
  const session = await parseAdminSession();
  if (!session) return { success: false, error: "Unauthorized" };
  if (!(await validateSessionForMutation(session))) return { success: false, error: "Session expired" };

  try {
    const threshold = getString(formData, "auto_ban_login_threshold") ?? "";
    const windowSeconds = getString(formData, "auto_ban_window_seconds") ?? "";

    const thresholdNum = parseInt(threshold, 10);
    const windowNum = parseInt(windowSeconds, 10);

    if (!Number.isFinite(thresholdNum) || thresholdNum < 1 || thresholdNum > 100) {
      return { error: "Threshold must be a number between 1 and 100." };
    }
    if (!Number.isFinite(windowNum) || windowNum < 60 || windowNum > 86400) {
      return { error: "Window must be between 60 and 86400 seconds." };
    }

    setConfig("auto_ban_login_threshold", String(thresholdNum));
    setConfig("auto_ban_window_seconds", String(windowNum));
    revalidatePath("/admin/security");
    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "Failed to save auto-ban settings." };
  }
}

async function banIpCommon(ip: string, reason: string): Promise<SecurityState> {
  if (isIpBanned(ip)) return { error: "This IP is already banned." };

  try {
    banIp(ip, reason);
  } catch (error) {
    console.error(error);
    return { error: "This IP is already banned." };
  }
  revalidatePath("/admin/security");
  return { success: true };
}

const IP_PATTERN = /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/;

export async function banIpAction(_prevState: SecurityState | null, formData: FormData): Promise<SecurityState> {
  const session = await parseAdminSession();
  if (!session) return { success: false, error: "Unauthorized" };
  if (!(await validateSessionForMutation(session))) return { success: false, error: "Session expired" };

  try {
    const ip = getString(formData, "ip_address") ?? "";
    const reason = getString(formData, "reason") ?? "manual";

    if (!ip) return { error: "IP address is required." };

    if (!IP_PATTERN.test(ip)) {
      return { error: "Invalid IP address format." };
    }

    return await banIpCommon(ip, reason);
  } catch (error) {
    console.error(error);
    return { error: "Failed to ban IP." };
  }
}

export async function unbanIpAction(_prevState: SecurityState | null, formData: FormData): Promise<SecurityState> {
  const session = await parseAdminSession();
  if (!session) return { success: false, error: "Unauthorized" };
  if (!(await validateSessionForMutation(session))) return { success: false, error: "Session expired" };

  try {
    const id = parseInt(getString(formData, "id") ?? "", 10);
    if (!Number.isFinite(id)) return { error: "Invalid ID." };
    unbanIp(id);
    revalidatePath("/admin/security");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "Failed to unban IP." };
  }
}

export async function banViolationIpAction(_prevState: SecurityState | null, formData: FormData): Promise<SecurityState> {
  const session = await parseAdminSession();
  if (!session) return { success: false, error: "Unauthorized" };
  if (!(await validateSessionForMutation(session))) return { success: false, error: "Session expired" };

  try {
    const ip = getString(formData, "ip_address") ?? "";
    if (!ip) return { error: "IP address is required." };

    if (!IP_PATTERN.test(ip)) {
      return { error: "Invalid IP address format." };
    }

    return await banIpCommon(ip, "manual");
  } catch (error) {
    console.error(error);
    return { error: "Failed to ban IP." };
  }
}

export async function saveSessionSettings(prevState: SecurityState | null, formData: FormData): Promise<SecurityState> {
  const session = await parseAdminSession();
  if (!session) return { success: false, error: "Unauthorized" };
  if (!(await validateSessionForMutation(session))) return { success: false, error: "Session expired" };

  try {
    const sessionMaxHours = getString(formData, "session_max_hours") ?? "";
    const pageViewDebounceMinutes = getString(formData, "page_view_debounce_minutes") ?? "";

    const hoursNum = parseInt(sessionMaxHours, 10);
    const minutesNum = parseInt(pageViewDebounceMinutes, 10);

    if (!Number.isFinite(hoursNum) || hoursNum < 1 || hoursNum > 24) {
      return { error: "Session expiry must be between 1 and 24 hours." };
    }
    if (!Number.isFinite(minutesNum) || minutesNum < 1 || minutesNum > 1440) {
      return { error: "Page view debounce must be between 1 and 1440 minutes." };
    }

    setConfig("session_max_hours", String(hoursNum));
    setConfig("page_view_debounce_minutes", String(minutesNum));
    revalidatePath("/admin/security");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "Failed to save session settings." };
  }
}

export async function saveSuspiciousSettings(prevState: SecurityState | null, formData: FormData): Promise<SecurityState> {
  const session = await parseAdminSession();
  if (!session) return { success: false, error: "Unauthorized" };
  if (!(await validateSessionForMutation(session))) return { success: false, error: "Session expired" };

  try {
    const threshold = getString(formData, "suspicious_ip_threshold") ?? "";
    const thresholdNum = parseInt(threshold, 10);

    if (!Number.isFinite(thresholdNum) || thresholdNum < 1 || thresholdNum > 100) {
      return { error: "Threshold must be a number between 1 and 100." };
    }

    setConfig("suspicious_ip_threshold", String(thresholdNum));
    revalidatePath("/admin/security");
    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "Failed to save suspicious IP settings." };
  }
}

export async function clearViolationsAction(_prevState: SecurityState | null, formData: FormData): Promise<SecurityState> {
  const session = await parseAdminSession();
  if (!session) return { success: false, error: "Unauthorized" };
  if (!(await validateSessionForMutation(session))) return { success: false, error: "Session expired" };

  try {
    const ip = getString(formData, "ip_address") ?? "";
    if (!ip) return { error: "IP address is required." };

    if (!IP_PATTERN.test(ip)) {
      return { error: "Invalid IP address format." };
    }

    clearViolations(ip);
    revalidatePath("/admin/security");
    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "Failed to clear violations." };
  }
}

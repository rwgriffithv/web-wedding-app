"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/auth";
import { getString } from "@/lib/form-data";
import { getConfig, setConfig } from "@/lib/repository/site-config";
import { banIp, unbanIp, isIpBanned } from "@/lib/repository/ip-bans";

interface SecurityState { success?: boolean; error?: string }

export async function saveAutoBanSettings(prevState: SecurityState | null, formData: FormData): Promise<SecurityState> {
  if (!(await isAdmin())) return { success: false, error: "Unauthorized" };

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
    return { success: true };
  } catch {
    return { error: "Failed to save auto-ban settings." };
  }
}

export async function banIpAction(prevState: SecurityState | null, formData: FormData): Promise<SecurityState> {
  if (!(await isAdmin())) return { success: false, error: "Unauthorized" };

  try {
    const ip = getString(formData, "ip_address") ?? "";
    const reason = getString(formData, "reason") ?? "manual";

    if (!ip) return { error: "IP address is required." };

    const ipPattern = /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/;
    if (!ipPattern.test(ip)) {
      return { error: "Invalid IP address format." };
    }

    if (isIpBanned(ip)) return { error: "This IP is already banned." };

    try {
      banIp(ip, reason);
    } catch {
      return { error: "This IP is already banned." };
    }
    revalidatePath("/admin/security");
    return { success: true };
  } catch {
    return { error: "Failed to ban IP." };
  }
}

export async function unbanIpAction(_prevState: SecurityState | null, formData: FormData): Promise<SecurityState> {
  if (!(await isAdmin())) return { success: false, error: "Unauthorized" };

  try {
    const id = parseInt(getString(formData, "id") ?? "", 10);
    if (!Number.isFinite(id)) return { error: "Invalid ID." };
    unbanIp(id);
    revalidatePath("/admin/security");
    return { success: true };
  } catch {
    return { error: "Failed to unban IP." };
  }
}

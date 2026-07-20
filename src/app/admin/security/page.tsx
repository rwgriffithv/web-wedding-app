import { Header } from "@/components/header";
import { getCombinedIpTable, getSuspiciousIpCount } from "@/lib/repository/ip-bans";
import { getAllConfig } from "@/lib/repository/site-config";
import { AUTO_BAN_THRESHOLD_DEFAULT, AUTO_BAN_WINDOW_DEFAULT, SUSPICIOUS_THRESHOLD_DEFAULT } from "@/lib/constants";
import { BanIpForm } from "./ban-ip-form";
import { SecuritySettingsForm } from "./security-settings-form";
import { SecurityTable } from "./security-table";

export default function AdminSecurityPage() {
  const config = Object.fromEntries(getAllConfig().map((c) => [c.key, c.value]));
  const autoBanThreshold = parseInt(config.auto_ban_login_threshold, 10) || AUTO_BAN_THRESHOLD_DEFAULT;
  const autoBanWindow = parseInt(config.auto_ban_window_seconds, 10) || AUTO_BAN_WINDOW_DEFAULT;
  const suspiciousThreshold = parseInt(config.suspicious_ip_threshold, 10) || SUSPICIOUS_THRESHOLD_DEFAULT;
  const combinedIps = getCombinedIpTable(suspiciousThreshold);
  const suspiciousCount = getSuspiciousIpCount(suspiciousThreshold);

  return (
    <>
      <Header title="Security" description="Manage IP banning, rate limiting, and session settings." />
      <details className="admin-section" open>
        <summary>Settings</summary>
        <div className="admin-section-body">
          <SecuritySettingsForm
            autoBanThreshold={String(autoBanThreshold)}
            autoBanWindowSeconds={String(autoBanWindow)}
            rateLimitMaxAttempts={config.rate_limit_max_attempts || "5"}
            rateLimitWindowSeconds={config.rate_limit_window_seconds || "60"}
            sessionMaxHours={config.session_max_hours || "24"}
            pageViewDebounceMinutes={config.page_view_debounce_minutes || "15"}
            suspiciousIpThreshold={String(suspiciousThreshold)}
          />
        </div>
      </details>
      <details className="admin-section">
        <summary>Ban IP</summary>
        <div className="admin-section-body">
          <BanIpForm />
        </div>
      </details>
      <details className="admin-section" open>
        <summary>IP Addresses ({combinedIps.length})</summary>
        <div className="admin-section-body">
          {suspiciousCount > 0 && (
            <p className="text-warning text-sm mb-2">
              {suspiciousCount} IP{suspiciousCount !== 1 ? "s" : ""} flagged as suspicious (at or above threshold).
            </p>
          )}
          <SecurityTable ips={combinedIps} />
        </div>
      </details>
    </>
  );
}

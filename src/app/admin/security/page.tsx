import { Header } from "@/components/header";
import { getCombinedIpTable, getSuspiciousIpCount } from "@/lib/repository/ip-bans";
import { getAllConfig } from "@/lib/repository/site-config";
import { AUTO_BAN_THRESHOLD_DEFAULT, AUTO_BAN_WINDOW_DEFAULT, SUSPICIOUS_THRESHOLD_DEFAULT, LOGIN_RATE_LIMIT_MAX_DEFAULT, LOGIN_RATE_LIMIT_WINDOW_SECONDS_DEFAULT, SESSION_MAX_HOURS_DEFAULT, PAGE_VIEW_DEBOUNCE_MINUTES_DEFAULT, AUTO_BAN_LOGIN_THRESHOLD_KEY, AUTO_BAN_WINDOW_SECONDS_KEY, LOGIN_RATE_LIMIT_MAX_KEY, LOGIN_RATE_LIMIT_WINDOW_SECONDS_KEY, SUSPICIOUS_IP_THRESHOLD_KEY, SESSION_MAX_HOURS_KEY, PAGE_VIEW_DEBOUNCE_MINUTES_KEY } from "@/lib/constants";
import { BanIpForm } from "./ban-ip-form";
import { SecuritySettingsForm } from "./security-settings-form";
import { SecurityTable } from "./security-table";

export default function AdminSecurityPage() {
  const config = Object.fromEntries(getAllConfig().map((c) => [c.key, c.value]));
  const autoBanThreshold = parseInt(config[AUTO_BAN_LOGIN_THRESHOLD_KEY], 10) || AUTO_BAN_THRESHOLD_DEFAULT;
  const autoBanWindow = parseInt(config[AUTO_BAN_WINDOW_SECONDS_KEY], 10) || AUTO_BAN_WINDOW_DEFAULT;
  const suspiciousThreshold = parseInt(config[SUSPICIOUS_IP_THRESHOLD_KEY], 10) || SUSPICIOUS_THRESHOLD_DEFAULT;
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
            rateLimitMaxAttempts={config[LOGIN_RATE_LIMIT_MAX_KEY] || String(LOGIN_RATE_LIMIT_MAX_DEFAULT)}
            rateLimitWindowSeconds={config[LOGIN_RATE_LIMIT_WINDOW_SECONDS_KEY] || String(LOGIN_RATE_LIMIT_WINDOW_SECONDS_DEFAULT)}
            sessionMaxHours={config[SESSION_MAX_HOURS_KEY] || String(SESSION_MAX_HOURS_DEFAULT)}
            pageViewDebounceMinutes={config[PAGE_VIEW_DEBOUNCE_MINUTES_KEY] || String(PAGE_VIEW_DEBOUNCE_MINUTES_DEFAULT)}
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

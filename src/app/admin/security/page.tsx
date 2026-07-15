import { Header } from "@/components/header";
import { getBannedIps, getAutoBanConfig, getRateLimitViolations, getSuspiciousConfig, getSuspiciousIps } from "@/lib/repository/ip-bans";
import { getAllConfig } from "@/lib/repository/site-config";
import { RateLimitForm } from "@/components/rate-limit-form";
import { BanList } from "./ban-list";
import { AutoBanForm } from "./auto-ban-form";
import { BanIpForm } from "./ban-ip-form";
import { ViolationList } from "./violation-list";
import { SessionSettingsForm } from "./session-settings-form";
import { SuspiciousSettingsForm } from "./suspicious-settings-form";
import { SuspiciousIpList } from "./suspicious-ip-list";

export default function AdminSecurityPage() {
  const bannedIps = getBannedIps();
  const { threshold: autoBanThreshold, windowSeconds: autoBanWindow } = getAutoBanConfig();
  const { threshold: suspiciousThreshold } = getSuspiciousConfig();
  const config = Object.fromEntries(getAllConfig().map((c) => [c.key, c.value]));
  const violations = getRateLimitViolations(autoBanWindow);
  const suspiciousIps = getSuspiciousIps(suspiciousThreshold);

  return (
    <>
      <Header title="Security" description="Manage IP banning, rate limiting, and session settings." />
      <details className="admin-section">
        <summary>Auto-Ban Settings</summary>
        <div className="admin-section-body">
          <AutoBanForm threshold={String(autoBanThreshold)} windowSeconds={String(autoBanWindow)} />
        </div>
      </details>
      <details className="admin-section">
        <summary>Login Rate Limiting</summary>
        <div className="admin-section-body">
          <RateLimitForm
            config={config}
            maxKey="rate_limit_max_attempts"
            windowKey="rate_limit_window_seconds"
            description="Rate limiting for login attempts per IP+user. Changes take effect on next request."
          />
        </div>
      </details>
      <details className="admin-section">
        <summary>Session & Tracking</summary>
        <div className="admin-section-body">
          <SessionSettingsForm
            sessionMaxHours={config.session_max_hours || "24"}
            pageViewDebounceMinutes={config.page_view_debounce_minutes || "15"}
          />
        </div>
      </details>
      <details className="admin-section" open>
        <summary>Suspicious IPs ({suspiciousIps.length})</summary>
        <div className="admin-section-body">
          <SuspiciousSettingsForm threshold={String(suspiciousThreshold)} />
          <SuspiciousIpList violations={suspiciousIps} />
        </div>
      </details>
      <details className="admin-section" open>
        <summary>Rate Limit Violations ({violations.length})</summary>
        <div className="admin-section-body">
          <ViolationList violations={violations} />
        </div>
      </details>
      <details className="admin-section">
        <summary>Ban IP</summary>
        <div className="admin-section-body">
          <BanIpForm />
        </div>
      </details>
      <details className="admin-section" open>
        <summary>Banned IPs ({bannedIps.length})</summary>
        <div className="admin-section-body">
          <BanList ips={bannedIps} />
        </div>
      </details>
    </>
  );
}

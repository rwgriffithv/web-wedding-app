import { Header } from "@/components/header";
import { getBannedIps, getAutoBanConfig } from "@/lib/repository/ip-bans";
import { getAllConfig } from "@/lib/repository/site-config";
import { RateLimitForm } from "@/components/rate-limit-form";
import { BanList } from "./ban-list";
import { AutoBanForm } from "./auto-ban-form";
import { BanIpForm } from "./ban-ip-form";

export default function AdminSecurityPage() {
  const bannedIps = getBannedIps();
  const { threshold, windowSeconds: autoBanWindow } = getAutoBanConfig();
  const config = Object.fromEntries(getAllConfig().map((c) => [c.key, c.value]));

  return (
    <>
      <Header title="Security" description="Manage IP banning and rate-limit violations." />
      <details className="admin-section" open>
        <summary>Auto-Ban Settings</summary>
        <div className="admin-section-body">
          <AutoBanForm threshold={String(threshold)} windowSeconds={String(autoBanWindow)} />
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

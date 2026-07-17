import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { getConfig } from "@/lib/repository/site-config";
import { isIpBanned } from "@/lib/repository/ip-bans";
import { getClientIp } from "@/lib/ip";
import { validateMediaUrl } from "@/lib/form-data";
import { LoginForm } from "./login-form";
import { CookieBlockWarning } from "@/components/cookie-block-warning";

export default async function LoginPage() {
  const session = await requireSession();
  if (session) {
    const redirectTo = session.type === "admin" ? "/admin" : "/home";
    redirect(redirectTo);
  }

  const ip = await getClientIp();
  if (isIpBanned(ip)) {
    return (
      <div className="banned-screen">
        <div className="banned-screen-inner">
          <p className="banned-screen-title">
            ⛔ IP banned ⛔
          </p>
          <p className="banned-screen-subtitle">
            Contact the site administrator if you believe this is an error.
          </p>
        </div>
      </div>
    );
  }

  const title = getConfig("landing_title");
  const background = getConfig("landing_background");
  const FALLBACK = "var(--color-fallback-gradient)";
  let safeBackground = FALLBACK;
  if (background) {
    if (background.startsWith("/api/media/")) {
      safeBackground = "url(/api/login-background)";
    } else if (background.startsWith("https://") && !validateMediaUrl(background)) {
      safeBackground = `url(${background})`;
    }
  }

  return (
    <div className="landing">
      <CookieBlockWarning />
      <div
        className="landing-bg"
        style={{ backgroundImage: safeBackground }}
      />
      <div className="landing-content">
        <h1>{title}</h1>
        <LoginForm />
      </div>
    </div>
  );
}

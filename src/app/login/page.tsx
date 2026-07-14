import { redirect } from "next/navigation";
import { parseSession } from "@/lib/auth";
import { getConfig } from "@/lib/repository/site-config";
import { validateMediaUrl } from "@/lib/form-data";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await parseSession();
  if (session) {
    const redirectTo = session.type === "admin" ? "/admin" : "/home";
    redirect(redirectTo);
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

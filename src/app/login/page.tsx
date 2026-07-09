import { redirect } from "next/navigation";
import { parseSession } from "@/lib/auth";
import { getConfig } from "@/lib/repository/site-config";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await parseSession();
  if (session) {
    const redirectTo = session.type === "admin" ? "/admin" : session.type === "party" ? "/rsvp" : "/home";
    redirect(redirectTo);
  }

  const title = getConfig("landing_title");
  const background = getConfig("landing_background");

  return (
    <div className="landing">
      <div
        className="landing-bg"
        style={{ backgroundImage: background ? `url(${background})` : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}
      />
      <div className="landing-content">
        <h1>{title}</h1>
        <LoginForm />
      </div>
    </div>
  );
}

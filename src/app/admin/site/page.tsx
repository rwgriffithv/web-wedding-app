import { getAllConfig } from "@/lib/repository/site-config";
import { Header } from "@/components/header";
import { SiteConfigForm } from "./site-config-form";

export default function AdminSitePage() {
  const config = getAllConfig();
  const configMap = Object.fromEntries(config.map((c) => [c.key, c.value]));

  return (
    <>
      <Header title="Site Configuration" description="Manage landing page, home page, and security settings." />
      <details className="admin-section" open>
        <summary>Site Settings</summary>
        <div className="admin-section-body">
          <SiteConfigForm config={configMap} />
        </div>
      </details>
    </>
  );
}

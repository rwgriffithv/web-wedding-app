import { getAllConfig } from "@/lib/repository/site-config";
import { Header } from "@/components/header";
import { SiteConfigForm } from "./site-config-form";

export default function AdminSitePage() {
  const config = getAllConfig();
  const configMap = Object.fromEntries(config.map((c) => [c.key, c.value]));

  return (
    <>
      <Header title="Home" description="Manage landing page, home page, and banner." />
      <details className="admin-section" open>
        <summary>Settings</summary>
        <div className="admin-section-body">
          <SiteConfigForm config={configMap} />
        </div>
      </details>
    </>
  );
}

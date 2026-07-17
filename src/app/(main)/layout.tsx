import { requireSessionOrRedirect } from "@/lib/auth";
import { getAllConfig } from "@/lib/repository/site-config";
import { Navigation } from "@/components/navigation";
import { PageViewTracker } from "@/components/page-view-tracker";
import { BannerText } from "@/components/banner-text";
import { CookieBlockWarning } from "@/components/cookie-block-warning";

interface MainLayoutProps {
  children: React.ReactNode;
}

export default async function MainLayout({ children }: MainLayoutProps) {
  const session = await requireSessionOrRedirect();

  const config = Object.fromEntries(getAllConfig().map((c) => [c.key, c.value]));
  const bannerText = config.banner_text || "";

  return (
    <>
      <CookieBlockWarning />
      {session.type === "party" && <PageViewTracker />}
      {bannerText && <BannerText text={bannerText} />}
      {children}
      <Navigation isAdmin={session.type === "admin"} />
    </>
  );
}

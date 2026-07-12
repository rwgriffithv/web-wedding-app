import { redirect } from "next/navigation";
import { parseSession } from "@/lib/auth";
import { Navigation } from "@/components/navigation";
import { PageViewTracker } from "@/components/page-view-tracker";

interface MainLayoutProps {
  children: React.ReactNode;
}

export default async function MainLayout({ children }: MainLayoutProps) {
  const session = await parseSession();
  if (!session) redirect("/");

  return (
    <>
      {session.type === "party" && <PageViewTracker />}
      {children}
      <Navigation isAdmin={session.type === "admin"} />
    </>
  );
}

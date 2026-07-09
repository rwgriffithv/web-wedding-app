import { redirect } from "next/navigation";
import { parseSession, getCurrentGuest } from "@/lib/auth";
import { Navigation } from "@/components/navigation";

interface MainLayoutProps {
  children: React.ReactNode;
}

export default async function MainLayout({ children }: MainLayoutProps) {
  const session = await parseSession();
  if (!session) redirect("/");

  const guest = await getCurrentGuest();

  return (
    <>
      {children}
      <Navigation isAdmin={session.type === "admin"} />
    </>
  );
}

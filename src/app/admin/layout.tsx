import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { AdminSidebar } from "@/components/admin-sidebar";
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: "noindex, nofollow",
};

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  if (!(await isAdmin())) redirect("/");

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <main className="admin-main">{children}</main>
    </div>
  );
}

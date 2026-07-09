import { redirect } from "next/navigation";
import Link from "next/link";
import { isAdmin } from "@/lib/auth";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  if (!(await isAdmin())) redirect("/");

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <h2>Admin Panel</h2>
        <Link href="/admin">Dashboard</Link>
        <Link href="/admin/site">Site Config</Link>
        <Link href="/admin/parties">Parties</Link>
        <Link href="/admin/guests">Guests</Link>
        <Link href="/admin/lodging">Lodging</Link>
        <Link href="/admin/dress-code">Dress Code</Link>
        <Link href="/admin/rsvp">RSVP</Link>
        <Link href="/admin/schedule">Schedule</Link>
        <Link href="/admin/media">Media</Link>
        <div style={{ flex: 1 }} />
        <Link href="/home" style={{ opacity: 0.6 }}>&larr; Back to Site</Link>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  );
}

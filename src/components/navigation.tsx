import Link from "next/link";
import { LogoutButton } from "./logout-button";

export function Navigation({ isAdmin }: { isAdmin?: boolean }) {
  return (
    <div className="wedding-nav-wrapper">
      <nav className="wedding-nav" aria-label="Main navigation">
        <div className="wedding-nav-inner">
          <Link href="/home">Home</Link>
          <Link href="/rsvp">RSVP</Link>
          <Link href="/guide">Guide</Link>
          <Link href="/media">Media</Link>
        </div>
      </nav>
      <div className="wedding-nav-secondary">
        {isAdmin && <Link href="/admin">Admin</Link>}
        <Link href="/help">Help</Link>
        <LogoutButton />
      </div>
    </div>
  );
}

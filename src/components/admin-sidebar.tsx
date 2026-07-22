"use client";

import { useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function AdminSidebar() {
  const pathname = usePathname();

  const close = useCallback(() => {
    document.querySelector(".admin-sidebar")?.classList.remove("open");
    document.querySelector(".admin-sidebar-backdrop")?.classList.remove("open");
    document.body.style.overflow = "";
  }, []);

  const toggle = useCallback(() => {
    const sidebar = document.querySelector(".admin-sidebar");
    const backdrop = document.querySelector(".admin-sidebar-backdrop");
    if (!sidebar || !backdrop) return;
    const isOpen = sidebar.classList.toggle("open");
    backdrop.classList.toggle("open", isOpen);
    document.body.style.overflow = isOpen ? "hidden" : "";
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [close]);

  useEffect(() => {
    close();
    return () => {
      document.body.style.overflow = "";
    };
  }, [pathname, close]);

  const links = [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/security", label: "Security" },
    { href: "/admin/site", label: "Home" },
    { href: "/admin/users", label: "Users" },
    { href: "/admin/guests", label: "Guests" },
    { href: "/admin/parties", label: "Parties" },
    { href: "/admin/rsvp", label: "RSVP" },
    { href: "/admin/schedule", label: "Schedule" },
    { href: "/admin/dress-code", label: "Dress Code" },
    { href: "/admin/lodging", label: "Lodging" },
    { href: "/admin/gifts", label: "Gifts" },
    { href: "/admin/media", label: "Media" },
    { href: "/admin/help", label: "Help" },
  ];

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  return (
    <>
      <div className="admin-sidebar-backdrop" onClick={close} aria-hidden="true" />
      <button className="sidebar-hamburger" onClick={toggle} aria-label="Toggle navigation">
        <span className="hamburger-bar" />
        <span className="hamburger-bar" />
        <span className="hamburger-bar" />
      </button>
      <aside className="admin-sidebar" aria-label="Admin navigation">
        <h2>Admin Panel</h2>
        <Link href="/home" className="sidebar-back-link">&larr; Back to Site</Link>
        {links.map(link => (
          <Link
            key={link.href}
            href={link.href}
            className={isActive(link.href) ? "active" : ""}
          >
            {link.label}
          </Link>
        ))}
      </aside>
    </>
  );
}

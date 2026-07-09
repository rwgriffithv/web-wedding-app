import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Navigation } from "./navigation";

vi.mock("next/navigation", () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

vi.mock("./logout-button", () => ({
  LogoutButton: () => <button type="submit">Logout</button>,
}));

describe("Navigation for guest users", () => {
  it("renders all guest navigation links", () => {
    render(<Navigation />);
    expect(screen.getByText("Home")).toBeDefined();
    expect(screen.getByText("RSVP")).toBeDefined();
    expect(screen.getByText("Guide")).toBeDefined();
    expect(screen.getByText("Media")).toBeDefined();
    expect(screen.getByText("Logout")).toBeDefined();
  });

  it("does not show admin link for guest users", () => {
    render(<Navigation />);
    expect(screen.queryByText("Admin")).toBeNull();
  });
});

describe("Navigation for admin users", () => {
  it("shows admin link when isAdmin is true", () => {
    render(<Navigation isAdmin />);
    expect(screen.getByText("Admin")).toBeDefined();
  });
});
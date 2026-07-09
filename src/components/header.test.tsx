import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Header } from "./header";

describe("Header", () => {
  it("renders title and description", () => {
    render(<Header title="Dashboard" description="Overview" />);
    expect(screen.getByText("Dashboard")).toBeDefined();
    expect(screen.getByText("Overview")).toBeDefined();
  });
});

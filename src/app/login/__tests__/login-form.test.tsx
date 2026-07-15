import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LoginForm } from "../login-form";

const mockLogin = vi.fn();
const mockLoginByPartyCode = vi.fn();
const mockRefresh = vi.fn();

vi.mock("../actions", () => ({
  login: (...args: unknown[]) => mockLogin(...args),
  loginByPartyCode: (...args: unknown[]) => mockLoginByPartyCode(...args),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

vi.mock("@/lib/utils", () => ({
  isRedirectError: () => false,
}));

function getCodeInput() {
  return screen.getByPlaceholderText("e.g. SMITH-A1B2") as HTMLInputElement;
}

function getUsernameInput() {
  return screen.getByPlaceholderText("Your username") as HTMLInputElement;
}

function getPasswordInput() {
  return screen.getByPlaceholderText("Enter password") as HTMLInputElement;
}

function getSubmitButton() {
  return screen.getByRole("button", { name: /^(Continue with Party Code|Sign In|Please wait|Looking up|Signing in)/i });
}

function clearCookie(name: string) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

describe("LoginForm", () => {
  beforeEach(() => {
    mockLogin.mockReset();
    mockLoginByPartyCode.mockReset();
    mockRefresh.mockReset();
    clearCookie("rl_until");
  });

  it("renders party code form by default", () => {
    render(<LoginForm />);
    expect(getCodeInput()).toBeDefined();
    expect(screen.getByText(/found on your invitation/i)).toBeDefined();
    expect(getSubmitButton()).toHaveTextContent(/continue with party code/i);
  });

  it("switches to credentials mode and back", () => {
    render(<LoginForm />);
    fireEvent.click(screen.getByText(/user sign in/i));
    expect(getUsernameInput()).toBeDefined();
    expect(getPasswordInput()).toBeDefined();

    fireEvent.click(screen.getByText(/back to party sign in/i));
    expect(getCodeInput()).toBeDefined();
  });

  it("party code submit calls loginByPartyCode and shows error", async () => {
    mockLoginByPartyCode.mockResolvedValue({ error: "Invalid party code. Please check your invitation." });
    render(<LoginForm />);
    fireEvent.change(getCodeInput(), { target: { value: "SMITH-1234" } });
    fireEvent.submit(getSubmitButton().closest("form")!);
    await waitFor(() => {
      expect(screen.getByText("Invalid party code. Please check your invitation.")).toBeDefined();
    });
    expect(mockLoginByPartyCode).toHaveBeenCalledTimes(1);
  });

  it("credentials submit calls login and shows error", async () => {
    mockLogin.mockResolvedValue({ error: "Invalid username or password." });
    render(<LoginForm />);
    fireEvent.click(screen.getByText(/user sign in/i));
    fireEvent.change(getUsernameInput(), { target: { value: "admin" } });
    fireEvent.change(getPasswordInput(), { target: { value: "wrong" } });
    fireEvent.submit(getSubmitButton().closest("form")!);
    await waitFor(() => {
      expect(screen.getByText("Invalid username or password.")).toBeDefined();
    });
    expect(mockLogin).toHaveBeenCalledTimes(1);
  });

  it("button is disabled during pending state", async () => {
    let resolve: (v: unknown) => void;
    mockLoginByPartyCode.mockImplementation(() => new Promise(r => { resolve = r; }));
    render(<LoginForm />);
    fireEvent.change(getCodeInput(), { target: { value: "SMITH-1234" } });
    fireEvent.submit(getSubmitButton().closest("form")!);
    await waitFor(() => {
      expect(getSubmitButton()).toBeDisabled();
    });
    expect(getSubmitButton().textContent).toMatch(/looking up/i);
    resolve!({ error: "Nope" });
    await waitFor(() => {
      expect(getSubmitButton()).not.toBeDisabled();
    });
  });

  it("shows rate limit cooldown when cookie is present", () => {
    document.cookie = `rl_until=${Date.now() + 10_000}`;
    render(<LoginForm />);
    expect(getSubmitButton()).toBeDisabled();
    expect(getSubmitButton().textContent).toMatch(/please wait/i);
    expect(getCodeInput()).toBeDisabled();
  });

  it("prevents submit when rate limited by cookie", () => {
    document.cookie = `rl_until=${Date.now() + 10_000}`;
    render(<LoginForm />);
    fireEvent.change(getCodeInput(), { target: { value: "SMITH-1234" } });
    fireEvent.submit(getSubmitButton().closest("form")!);
    expect(mockLoginByPartyCode).not.toHaveBeenCalled();
    expect(screen.getByText(/too many attempts/i)).toBeDefined();
  });

  it("triggers router.refresh on IP ban error", async () => {
    mockLoginByPartyCode.mockResolvedValue({ error: "Your IP has been banned.", action: "refresh" });
    render(<LoginForm />);
    fireEvent.change(getCodeInput(), { target: { value: "SMITH-1234" } });
    fireEvent.submit(getSubmitButton().closest("form")!);
    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });
  });

  it("triggers router.refresh on IP ban error in credentials mode", async () => {
    mockLogin.mockResolvedValue({ error: "Your IP has been banned.", action: "refresh" });
    render(<LoginForm />);
    fireEvent.click(screen.getByText(/user sign in/i));
    fireEvent.change(getUsernameInput(), { target: { value: "admin" } });
    fireEvent.change(getPasswordInput(), { target: { value: "pass" } });
    fireEvent.submit(getSubmitButton().closest("form")!);
    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });
  });
});

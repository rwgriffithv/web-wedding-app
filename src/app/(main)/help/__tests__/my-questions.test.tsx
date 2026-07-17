import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MyQuestions } from "../my-questions";
import type { Question } from "@/lib/db";

const mockSubmit = vi.fn();
const mockPush = vi.fn();

vi.mock("../actions", () => ({
  submitQuestion: (...args: unknown[]) => mockSubmit(...args),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

function getTextarea() {
  return screen.getByPlaceholderText("Type your question here...") as HTMLTextAreaElement;
}

function getSubmitButton() {
  return screen.getByRole("button", { name: /submit question|submitting|please wait/i });
}

const emptyQuestions: Question[] = [];

describe("MyQuestions — form state persistence", () => {
  beforeEach(() => {
    mockSubmit.mockReset();
    mockPush.mockReset();
    vi.useRealTimers();
    localStorage.removeItem("rl_q_until");
  });

  it("textarea retains text after failed submit", async () => {
    mockSubmit.mockResolvedValue({ success: false, error: "Question is required." });

    render(<MyQuestions questions={emptyQuestions} />);
    const textarea = getTextarea();

    fireEvent.change(textarea, { target: { value: "My question" } });
    expect(textarea.value).toBe("My question");

    fireEvent.submit(getSubmitButton().closest("form")!);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeVisible();
    });

    expect(textarea.value).toBe("My question");
  });

  it("textarea clears after successful submit", async () => {
    mockSubmit.mockResolvedValue({ success: true });

    render(<MyQuestions questions={emptyQuestions} />);
    const textarea = getTextarea();

    fireEvent.change(textarea, { target: { value: "My question" } });
    expect(textarea.value).toBe("My question");

    fireEvent.submit(getSubmitButton().closest("form")!);

    await waitFor(() => {
      expect(screen.getByText(/question submitted/i)).toBeVisible();
    });

    expect(textarea.value).toBe("");
  });

  it("textarea text persists across multiple submits", async () => {
    mockSubmit.mockResolvedValueOnce({ success: false, error: "Too long." })
      .mockResolvedValueOnce({ success: true });

    render(<MyQuestions questions={emptyQuestions} />);
    const textarea = getTextarea();
    const form = getSubmitButton().closest("form")!;

    // First submit: error
    fireEvent.change(textarea, { target: { value: "Some text" } });
    fireEvent.submit(form);
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeVisible();
    });
    expect(textarea.value).toBe("Some text");

    // Second submit: success
    fireEvent.submit(form);
    await waitFor(() => {
      expect(screen.getByText(/question submitted/i)).toBeVisible();
    });
    expect(textarea.value).toBe("");
  });

  it("shows success message after submit", async () => {
    mockSubmit.mockResolvedValue({ success: true });

    render(<MyQuestions questions={emptyQuestions} />);
    fireEvent.change(getTextarea(), { target: { value: "Hello?" } });
    fireEvent.submit(getSubmitButton().closest("form")!);

    await waitFor(() => {
      expect(screen.getByText(/question submitted/i)).toBeVisible();
    });
  });

  it("shows error message after failed submit", async () => {
    mockSubmit.mockResolvedValue({ success: false, error: "Server error." });

    render(<MyQuestions questions={emptyQuestions} />);
    fireEvent.change(getTextarea(), { target: { value: "Hello?" } });
    fireEvent.submit(getSubmitButton().closest("form")!);

    await waitFor(() => {
      expect(screen.getByText("Server error.")).toBeVisible();
    });
  });

  it("shows rate limit error when too many requests", async () => {
    mockSubmit.mockResolvedValue({
      success: false,
      error: "Your party has made too many requests. Please wait before trying again.",
      action: "cooldown",
      cooldownUntil: Date.now() + 60_000,
    });

    render(<MyQuestions questions={emptyQuestions} />);
    fireEvent.change(getTextarea(), { target: { value: "Help me" } });
    fireEvent.submit(getSubmitButton().closest("form")!);

    await waitFor(() => {
      expect(screen.getByText(/too many requests/i)).toBeVisible();
    });
  });

  it("shows cooldown after rate limit error, then re-enables", { timeout: 15_000 }, async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    mockSubmit.mockResolvedValueOnce({
      success: false,
      error: "Your party has made too many requests. Please wait before trying again.",
      action: "cooldown",
      cooldownUntil: Date.now() + 10_000,
    }).mockResolvedValueOnce({ success: true });

    render(<MyQuestions questions={emptyQuestions} />);
    const textarea = getTextarea();

    // First submit: rate limit error
    fireEvent.change(textarea, { target: { value: "Help me" } });
    fireEvent.submit(getSubmitButton().closest("form")!);
    await waitFor(() => {
      expect(screen.getByText(/too many requests/i)).toBeVisible();
    });

    // Button should be disabled during cooldown
    expect(getSubmitButton()).toBeDisabled();
    expect(getSubmitButton().textContent).toMatch(/please wait/i);

    // Wait for 10s cooldown to expire (shouldAdvanceTime lets real time tick the fake clock)
    await waitFor(() => {
      expect(getSubmitButton()).not.toBeDisabled();
    }, { timeout: 12_000 });

    // Button re-enables, textarea retains text
    expect(textarea.value).toBe("Help me");

    vi.useRealTimers();
  });

  it("textarea retains text after rate limit error", async () => {
    mockSubmit.mockResolvedValue({
      success: false,
      error: "Your party has made too many requests. Please wait before trying again.",
      action: "cooldown",
      cooldownUntil: Date.now() + 60_000,
    });

    render(<MyQuestions questions={emptyQuestions} />);
    const textarea = getTextarea();

    fireEvent.change(textarea, { target: { value: "My question" } });
    fireEvent.submit(getSubmitButton().closest("form")!);

    await waitFor(() => {
      expect(screen.getByText(/too many requests/i)).toBeVisible();
    });

    expect(textarea.value).toBe("My question");
  });

  it("submit button disabled while pending", async () => {
    let resolveSubmit: (v: unknown) => void;
    mockSubmit.mockImplementation(() => new Promise(r => { resolveSubmit = r; }));

    render(<MyQuestions questions={emptyQuestions} />);
    fireEvent.change(getTextarea(), { target: { value: "Hello?" } });
    fireEvent.submit(getSubmitButton().closest("form")!);

    await waitFor(() => {
      expect(getSubmitButton()).toBeDisabled();
    });

    resolveSubmit!({ success: true });

    await waitFor(() => {
      expect(getSubmitButton()).not.toBeDisabled();
    });
  });

  it("displays existing questions", () => {
    const questions: Question[] = [
      { id: 1, party_id: 1, question: "What time is the ceremony?", answer: "2 PM", created_at: "2026-07-14", answered_at: "2026-07-14" },
      { id: 2, party_id: 1, question: "Is there parking?", answer: null, created_at: "2026-07-14", answered_at: null },
    ];

    render(<MyQuestions questions={questions} />);
    expect(screen.getByText("What time is the ceremony?")).toBeDefined();
    expect(screen.getByText("Is there parking?")).toBeDefined();
    expect(screen.getByText("2 PM")).toBeDefined();
    expect(screen.getByText("Awaiting response...")).toBeDefined();
  });

  it("shows empty state when no questions", () => {
    render(<MyQuestions questions={[]} />);
    expect(screen.getByText(/haven't asked any questions/i)).toBeDefined();
  });
});

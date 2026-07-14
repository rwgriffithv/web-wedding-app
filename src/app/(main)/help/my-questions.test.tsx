import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MyQuestions } from "./my-questions";
import type { Question } from "@/lib/db";

const mockSubmit = vi.fn();

vi.mock("./actions", () => ({
  submitQuestion: (...args: unknown[]) => mockSubmit(...args),
}));

function getTextarea() {
  return screen.getByPlaceholderText("Type your question here...") as HTMLTextAreaElement;
}

function getSubmitButton() {
  return screen.getByRole("button", { name: /submit question|submitting/i });
}

const emptyQuestions: Question[] = [];

describe("MyQuestions — form state persistence", () => {
  beforeEach(() => {
    mockSubmit.mockReset();
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

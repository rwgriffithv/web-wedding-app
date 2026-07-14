import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FaqForm } from "../faq-form";

const mockAddFaq = vi.fn();

vi.mock("../actions", () => ({
  addFaq: (...args: unknown[]) => mockAddFaq(...args),
}));

function getQuestionTextarea() {
  return screen.getByRole("textbox", { name: /question/i }) as HTMLTextAreaElement;
}

function getAnswerTextarea() {
  return screen.getByRole("textbox", { name: /answer/i }) as HTMLTextAreaElement;
}

function getSubmitButton() {
  return screen.getByRole("button", { name: /add faq|adding/i });
}

describe("FaqForm — form state persistence", () => {
  beforeEach(() => {
    mockAddFaq.mockReset();
  });

  it("both textareas retain text after failed submit", async () => {
    mockAddFaq.mockResolvedValue({ success: false, error: "Question is required." });

    render(<FaqForm />);
    const question = getQuestionTextarea();
    const answer = getAnswerTextarea();

    fireEvent.change(question, { target: { value: "What time?" } });
    fireEvent.change(answer, { target: { value: "2 PM" } });

    fireEvent.submit(getSubmitButton().closest("form")!);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeVisible();
    });

    expect(question.value).toBe("What time?");
    expect(answer.value).toBe("2 PM");
  });

  it("both textareas clear after successful submit", async () => {
    mockAddFaq.mockResolvedValue({ success: true });

    render(<FaqForm />);
    const question = getQuestionTextarea();
    const answer = getAnswerTextarea();

    fireEvent.change(question, { target: { value: "What time?" } });
    fireEvent.change(answer, { target: { value: "2 PM" } });

    fireEvent.submit(getSubmitButton().closest("form")!);

    await waitFor(() => {
      expect(screen.getByText(/faq item added/i)).toBeVisible();
    });

    expect(question.value).toBe("");
    expect(answer.value).toBe("");
  });

  it("textareas persist across multiple submits", async () => {
    mockAddFaq.mockResolvedValueOnce({ success: false, error: "Answer is required." })
      .mockResolvedValueOnce({ success: true });

    render(<FaqForm />);
    const question = getQuestionTextarea();
    const answer = getAnswerTextarea();
    const form = getSubmitButton().closest("form")!;

    // First submit: error
    fireEvent.change(question, { target: { value: "Q1?" } });
    fireEvent.change(answer, { target: { value: "A1" } });
    fireEvent.submit(form);
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeVisible();
    });
    expect(question.value).toBe("Q1?");
    expect(answer.value).toBe("A1");

    // Second submit: success
    fireEvent.submit(form);
    await waitFor(() => {
      expect(screen.getByText(/faq item added/i)).toBeVisible();
    });
    expect(question.value).toBe("");
    expect(answer.value).toBe("");
  });

  it("shows success message after submit", async () => {
    mockAddFaq.mockResolvedValue({ success: true });

    render(<FaqForm />);
    fireEvent.change(getQuestionTextarea(), { target: { value: "Q?" } });
    fireEvent.change(getAnswerTextarea(), { target: { value: "A" } });
    fireEvent.submit(getSubmitButton().closest("form")!);

    await waitFor(() => {
      expect(screen.getByText(/faq item added/i)).toBeVisible();
    });
  });

  it("shows error message after failed submit", async () => {
    mockAddFaq.mockResolvedValue({ success: false, error: "Unauthorized" });

    render(<FaqForm />);
    fireEvent.change(getQuestionTextarea(), { target: { value: "Q?" } });
    fireEvent.change(getAnswerTextarea(), { target: { value: "A" } });
    fireEvent.submit(getSubmitButton().closest("form")!);

    await waitFor(() => {
      expect(screen.getByText("Unauthorized")).toBeVisible();
    });
  });

  it("submit button disabled while pending", async () => {
    let resolveAdd: (v: unknown) => void;
    mockAddFaq.mockImplementation(() => new Promise(r => { resolveAdd = r; }));

    render(<FaqForm />);
    fireEvent.change(getQuestionTextarea(), { target: { value: "Q?" } });
    fireEvent.change(getAnswerTextarea(), { target: { value: "A" } });
    fireEvent.submit(getSubmitButton().closest("form")!);

    await waitFor(() => {
      expect(getSubmitButton()).toBeDisabled();
    });

    resolveAdd!({ success: true });

    await waitFor(() => {
      expect(getSubmitButton()).not.toBeDisabled();
    });
  });

  it("does not clear fields on error", async () => {
    mockAddFaq.mockResolvedValue({ success: false, error: "Failed to add FAQ item." });

    render(<FaqForm />);
    const question = getQuestionTextarea();
    const answer = getAnswerTextarea();

    fireEvent.change(question, { target: { value: "Important Q" } });
    fireEvent.change(answer, { target: { value: "Important A" } });
    fireEvent.submit(getSubmitButton().closest("form")!);

    await waitFor(() => {
      expect(screen.getByText("Failed to add FAQ item.")).toBeVisible();
    });

    expect(question.value).toBe("Important Q");
    expect(answer.value).toBe("Important A");
  });
});

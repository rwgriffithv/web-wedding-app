"use client";

import { useActionState } from "react";

interface TabTextFormProps {
  label: string;
  fieldName: string;
  currentText: string;
  maxLength?: number;
  action: (prevState: { success?: boolean; error?: string } | null, formData: FormData) => Promise<{ success?: boolean; error?: string }>;
}

const initialState: { success?: boolean; error?: string } | null = null;

export function TabTextForm({ label, fieldName, currentText, maxLength, action }: TabTextFormProps) {
  const [state, dispatch, isPending] = useActionState(action, initialState);

  return (
    <form action={dispatch} className="styled-form">
      <div className="form-group">
        <label htmlFor={fieldName}>{label}</label>
        <textarea id={fieldName} name={fieldName} defaultValue={currentText} rows={3} maxLength={maxLength} />
      </div>
      {state?.success && <p className="text-success text-sm mb-1" role="status">Saved successfully.</p>}
      {state?.error && <p className="text-error text-sm mb-1" role="alert">{state.error}</p>}
      <button type="submit" className="btn btn-primary" disabled={isPending}>{isPending ? "Saving..." : "Save"}</button>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { saveDressCodeText } from "./actions";

interface DressCodeTextFormProps {
  currentText: string;
}

const initialState = null as { success?: boolean; error?: string } | null;

export function DressCodeTextForm({ currentText }: DressCodeTextFormProps) {
  const [state, dispatch, isPending] = useActionState(saveDressCodeText, initialState);

  return (
    <form action={dispatch} className="admin-form">
      <div className="form-group">
        <label htmlFor="dress_code_text">Dress Code Description</label>
        <textarea id="dress_code_text" name="dress_code_text" defaultValue={currentText} rows={4} />
      </div>
      {state?.success && <p className="text-success text-sm mb-1" role="status">Saved successfully.</p>}
      {state?.error && <p className="text-error text-sm mb-1" role="alert">{state.error}</p>}
      <button type="submit" className="btn btn-primary" disabled={isPending}>{isPending ? "Saving..." : "Save Description"}</button>
    </form>
  );
}

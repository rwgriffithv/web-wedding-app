# RSVP Radio Button Fix — React 19 Form Reset Root Cause

- **Date:** 2026-07-14
- **Scope:** RSVP form radio button state persistence and cross-device compatibility

## Context

The RSVP form's radio buttons reverted to their previous state after form submission. The backend saved correctly (page refresh showed the right answer), but the UI flashed back to the old value. Additionally, iOS Safari had no touch-specific handling for radio inputs.

## Root Cause

**React 19's `<form action={fn}>` automatically resets form fields after the action succeeds.** The React docs state: *"After the action function succeeds, all uncontrolled field elements in the form are reset."* In practice, this affected controlled radio buttons as well — the form reset triggered a re-render cascade that overwrote the controlled `checked` state.

The earlier hypothesis (sync-from-action `useEffect` overwriting local state) was a red herring. Removing that `useEffect` did not fix the bug. The actual cause was the `action={dispatch}` prop on the `<form>` element, which invoked React 19's built-in form reset behavior after every successful submission.

## Design Decisions

### 1. Replace `useActionState` + `action={dispatch}` with `onSubmit` handler

**Chosen:** Use `onSubmit={handleSubmit}` with `e.preventDefault()` and manual `useState` for `state`/`isPending`. Call the server action directly via `new FormData(e.currentTarget)`.

**Rejected alternatives:**
- Keep `action={dispatch}` with form reset workarounds — fragile, fights the framework
- `useOptimistic` — unnecessary complexity for rollback handling
- `router.refresh()` — causes full page re-render and visual flash

**Why:** The `onSubmit` handler bypasses React 19's automatic form reset entirely. The server action is still called as a regular async function. `useRef` for `lastAnsweredId` and the sync-from-action pattern are both eliminated — the component is simpler and more predictable.

### 2. Local state as source of truth

The user's local `useState` values ARE the source of truth. On submit, the action persists them to the DB. No `useEffect` syncs state back from the action return. The `hasSubmitted` flag is set via `useEffect` (not synchronously in the handler) so the "Response submitted." / "Response updated." text renders correctly across React's batched state updates.

### 3. Explicit `id`/`htmlFor` on radio inputs

Add explicit `id` attributes to radio `<input>` elements and matching `htmlFor` on `<label>` wrappers. iOS Safari has known issues with nested `<label>` + React's synthetic event delegation. Explicit `id`/`htmlFor` bindings bypass the nested label tap ambiguity.

### 4. Touch-action + tap highlight CSS

Add `touch-action: manipulation` and `-webkit-tap-highlight-color: transparent` to radio labels. Prevents iOS Safari's double-tap-to-zoom and removes inconsistent blue tap highlight.

## Blueprint

| File | Change |
|------|--------|
| `src/app/(main)/rsvp/rsvp-form.tsx` | Replace `useActionState` with `onSubmit` + `useState`; controlled plus-one name input; submit disabled when name empty |
| `src/app/(main)/rsvp/rsvp-form.test.tsx` | 8 component tests: radio persistence across single/multiple submits, plus-one radio, attending=no reset, server errors, existing response pre-fill |
| `src/app/(main)/rsvp/actions.ts` | Simplify `RsvpState` to `{ success, error }`; validate plus-one name server-side |
| `src/app/globals.css` | Add `touch-action`, `-webkit-tap-highlight-color`, `cursor: pointer` to radio elements |
| `e2e/rsvp.spec.ts` | Add test: submit, verify radio persists, change, submit again |

## Compliance

- [x] Server Actions return structured `{ success, error }` state
- [x] CSS conventions (safe-area, mobile breakpoint)
- [x] No comments, reuse patterns, run typecheck/lint/tests
- [x] Explicit return types on all modified functions
- [x] No `any` types introduced
- [x] E2E test covers the exact user-reported scenario (submit → radio persists)
- [x] 8 component tests confirm radio persistence through submit cycle

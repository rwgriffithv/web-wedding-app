# RSVP Radio Button — Simplified Client State + iOS/Safari Compatibility

- **Date:** 2026-07-14
- **Scope:** RSVP form radio button state persistence and cross-device compatibility

## Context

The RSVP form's radio buttons reverted to their previous state after form submission. The backend saved correctly (page refresh showed the right answer), but the UI flashed back to the old value. Additionally, iOS Safari had no touch-specific handling for radio inputs.

## Design Decisions

### 1. Local state as source of truth (no sync-from-action)

**Chosen:** The user's local `useState` values ARE the source of truth. On submit, the action persists them to the DB. No `useEffect` syncs state back from the action return.

**Rejected alternatives:**
- Sync from action return (`submittedAttending`/`submittedPlusOneName`) — caused cascading re-renders and radio reverts because `useEffect` ordering created intermediate state changes
- `router.refresh()` — causes full page re-render and visual flash
- `useOptimistic` — unnecessary complexity for rollback handling

**Why:** The user's radio selections and text input are already correct. The server action just saves them. Syncing back from the action return was redundant and harmful — it overwrote the user's state with values that were already identical, but triggered React re-render cascades through chained `useEffect`s.

The action validates inputs (rejects empty plus-one names when "yes") and returns `{ success, error }`. The client uses this only for the success/error message and the "Update" vs "Submit" button label.

### 2. Explicit `id`/`htmlFor` on radio inputs

**Chosen:** Add explicit `id` attributes to radio `<input>` elements and matching `htmlFor` on `<label>` wrappers.

**Why:** iOS Safari has known issues with nested `<label>` + React's synthetic event delegation. Explicit `id`/`htmlFor` bindings bypass the nested label tap ambiguity and are the W3C-recommended pattern for accessible radio groups.

### 3. Touch-action + tap highlight CSS

**Chosen:** Add `touch-action: manipulation` and `-webkit-tap-highlight-color: transparent` to radio labels.

**Why:** `touch-action: manipulation` prevents iOS Safari's double-tap-to-zoom behavior on interactive elements. `-webkit-tap-highlight-color: transparent` removes the inconsistent blue tap highlight on iOS. Both are minimal, non-breaking CSS additions.

## Blueprint

| File | Change |
|------|--------|
| `src/app/(main)/rsvp/actions.ts` | Simplify `RsvpState` to `{ success, error }`; validate plus-one name server-side |
| `src/app/(main)/rsvp/rsvp-form.tsx` | Remove sync-from-action `useEffect`; controlled plus-one name input; submit disabled when name empty |
| `src/app/globals.css` | Add `touch-action`, `-webkit-tap-highlight-color`, `cursor: pointer` to radio elements |
| `e2e/rsvp.spec.ts` | Add test: submit, verify radio persists, change, submit again |

## Compliance

- [x] Server Actions return structured `{ success, error }` state
- [x] CSS conventions (safe-area, mobile breakpoint)
- [x] No comments, reuse patterns, run typecheck/lint/tests
- [x] Explicit return types on all modified functions
- [x] No `any` types introduced
- [x] E2E test covers the exact user-reported scenario (submit → radio persists)

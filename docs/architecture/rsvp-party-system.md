# RSVP Party System Architecture

## Context

The original RSVP system tied each response to a single `guest_id`. Families and groups had to RSVP individually with separate logins — inconvenient. The `guest_plus_one` type only supported a single unnamed +1. Additionally, there was no way to designate "view-only" guests (e.g., children, definite attendees who don't need to RSVP).

The new system groups guests into **parties** (households / social groups) with a **unique access code** for convenient family login. Any authenticated party member can RSVP for themselves or any other member of their party.

## Design Decisions

### Party Model (Group-Based RSVP)
Instead of per-person login, each party gets a unique code (e.g. `SMITH-A1B2`). The code is printed on invitations. A guest enters it on the login page and can RSVP for all pre-defined party members at once. Individual username/password login is preserved for admin accounts and guests who prefer it.

### Repository Pattern
Each data entity (Party, Guest, RsvpResponse) has a dedicated repository module in `src/lib/repository/`. Server Actions orchestrate read/write operations. This keeps data access consistent, testable, and decoupled from route handlers. The pattern was already established in the codebase.

### Access Code Authorization
When a guest submits a party RSVP, the server action validates:
1. The submitting guest is authenticated
2. Every target `guest_id` shares the same `party_id` as the submitter
3. Individual (non-party) guests can only RSVP for themselves

### View-Only Guests
A `can_rsvp` flag on the `guests` table allows admin to designate guests who can browse the website but see an informational message instead of the RSVP form. Useful for children, vendors, or guests whose attendance is already confirmed.

## Blueprint

### New Files
- `src/lib/repository/party.ts` — Party CRUD, code generation, lookup by code
- `src/app/admin/parties/page.tsx` — Admin: list, create, and manage parties
- `src/app/admin/parties/actions.ts` — Server Actions for party CRUD
- `src/app/admin/parties/party-list.tsx` — Client component for party rows with inline member management
- `src/app/admin/parties/party-form.tsx` — Client form for creating parties

### Modified Files
- `src/lib/schema.ts` — Added `parties` table, new columns on `guests` (`party_id`, `can_rsvp`, `can_bring_plus_one`)
- `src/lib/db.ts` — Added `Party` interface, migration logic, updated seed defaults
- `src/lib/repository/guests.ts` — Added `getGuestsByPartyId()`, updated `updateGuest()`/`createGuest()` for new columns
- `src/app/login/page.tsx` — Redirect authenticated guests to `/rsvp`
- `src/app/login/actions.ts` — Added `loginByPartyCode()` server action
- `src/app/login/login-form.tsx` — Dual-mode form (username/password OR party code)
- `src/app/(main)/rsvp/page.tsx` — Party-aware: loads party members, handles view-only guests
- `src/app/(main)/rsvp/actions.ts` — Bulk RSVP submission with party validation
- `src/app/(main)/rsvp/rsvp-form.tsx` — Multi-member form with per-person toggles
- `src/app/admin/layout.tsx` — Added "Parties" link to sidebar
- `src/app/admin/guests/page.tsx` — Shows party names in guest list
- `src/app/admin/guests/guest-list.tsx` — Inline `can_rsvp`/`can_bring_plus_one` toggles
- `src/app/admin/guests/guest-form.tsx` — New guest form with `can_rsvp`/`can_bring_plus_one` selects
- `src/app/admin/guests/actions.ts` — Server actions updated for new guest columns
- `scripts/db-seed.ts` — Creates demo party and view-only guest

## Compliance

- [x] Server-first architecture — all database access in Server Components/Server Actions
- [x] Strict TypeScript — no `any`, explicit interfaces for all entities
- [x] Repository pattern — `src/lib/repository/` per entity
- [x] Structured action responses — `{ success, error?, data? }` pattern
- [x] Revalidation after mutations — `revalidatePath()` on all admin and RSVP actions
- [x] Parameterized queries — no raw SQL concatenation
- [x] Client Components pushed to leaf level — forms are leaf components, pages are Server Components

# Help / Questions Page

- **Scope:** FAQ display, party question submission, admin question management

## Overview

The help page at `/help` provides two tabs: a read-only FAQ managed by the admin, and a "My Questions" tab where party members can submit questions and see answers. The admin dashboard at `/admin/help` manages FAQ items and answers party questions.

---

## Tab Routing

Tabs use URL-based routing (same pattern as guide and media pages):

```
/help                  →  FAQ tab (default)
/help?tab=my-questions  →  My Questions tab
```

Tabs are hardcoded:

```ts
const TABS = [
  { id: "faq", label: "FAQ" },
  { id: "my-questions", label: "My Questions" },
] as const;
```

Invalid `?tab=` values fall back to `"faq"`.

## Public Help Page

### FAQ Tab

Server component renders FAQ items in order with styled "Q:" and "A:" labels:

```html
<div class="faq-item">
  <div class="faq-question"><strong>Q:</strong> What time is the ceremony?</div>
  <div class="faq-answer"><strong>A:</strong> 2:00 PM</div>
</div>
```

Empty state: "No FAQ items yet."

### My Questions Tab

Client component with a submission form and question list.

**Form:** Controlled textarea (max 1000 chars) with character count. Calls `submitQuestion` server action. On success, clears the textarea. On error, shows the error message.

**Question list:** Shows each question with date, "Q:" prefix, and either the answer ("A:" prefix) or italic "Awaiting response..." placeholder. Questions are ordered most recent first.

**Non-party users:** If logged in as admin or viewer (not party), shows a message that this tab is only available with a party code login.

## Server Actions

### Public: `submitQuestion`

```
src/app/(main)/help/actions.ts
```

| Step | Detail |
|---|---|
| Auth | Requires party session (`validateSessionInDb()` → cookie + HMAC + DB check → `partyId`) |
| Rate limit | Per-party sliding window (default: 5 req/60s, configurable) |
| Validation | Question required, max 1000 chars |
| Database | `INSERT INTO questions` |
| Cache | `revalidatePath("/help")` |

### Admin: FAQ CRUD

```
src/app/admin/help/actions.ts
```

| Action | Parameters | Notes |
|---|---|---|
| `addFaq` | `question`, `answer` | Both required, max 1000 chars each |
| `updateFaq` | `faq_id`, `question`, `answer` | Inline editing from admin list |
| `deleteFaq` | `faq_id` | Two-step confirmation |
| `moveFaq` | `faq_id`, `direction` ("up"/"down") | Swaps `sort_order` with neighbor |
| `answerQuestion` | `question_id`, `answer` | Only answers unanswered questions |

All admin actions are guarded by `requireAdminSessionOrNull()` and revalidate both `/admin/help` and `/help`.

## Admin Dashboard

`/admin/help` renders four collapsible `<details>` sections:

### Rate Limiting (collapsed by default)

Reusable `<RateLimitForm>` component with config keys `question_rate_limit_max` and `question_rate_limit_window`. Defaults: 5 attempts, 60 seconds. Changes take effect on next request.

### Add FAQ Item (open by default)

Two textareas (question + answer) with character counts. Clears on success.

### FAQ Items (open by default)

Searchable, editable, reorderable list:
- **Search:** Filters by question or answer text (case-insensitive)
- **Edit:** Inline textarea editing with Save/Cancel
- **Reorder:** Up/down arrows swap `sort_order` values
- **Delete:** Two-step confirmation prompt

### Party Questions (open by default)

Stats bar showing total and unanswered counts. Searchable, filterable, sortable list:
- **Search:** Filters by party name or question text
- **Filter:** "All" or "Unanswered" toggle
- **Sort:** "By Date" (default) or "By Party"
- **Answer:** Inline textarea form for unanswered questions

## Rate Limiting

Question submissions are rate-limited per party using an in-memory sliding-window limiter (key: `party:{partyId}`). This is the same rate-limiting infrastructure used for login and RSVP — see [authentication.md](authentication.md#rate-limiting) for how it works.

| Config Key | Default | Range |
|---|---|---|
| `question_rate_limit_max` | 5 | 1–1000 |
| `question_rate_limit_window` | 60 | 1–1000 seconds |

When the limit is exceeded, the server returns `{ error: "...", action: "cooldown", cooldownUntil }`. The client creates a `rl_q_until` cookie from the timestamp and displays a countdown timer ("Please wait Xs..."). The form is disabled during the cooldown. Config is editable via the Rate Limiting section on `/admin/help`.

## Files

| File | Role |
|---|---|
| `src/app/(main)/help/page.tsx` | Server Component — tab routing, data loading |
| `src/app/(main)/help/faq-content.tsx` | Server Component — FAQ display |
| `src/app/(main)/help/my-questions.tsx` | Client Component — question form + list |
| `src/app/(main)/help/actions.ts` | Server Action — `submitQuestion` |
| `src/app/admin/help/page.tsx` | Server Component — admin dashboard layout |
| `src/app/admin/help/actions.ts` | Server Actions — FAQ CRUD, answer questions |
| `src/app/admin/help/faq-form.tsx` | Client Component — FAQ creation form |
| `src/app/admin/help/faq-list.tsx` | Client Component — FAQ list with search/edit/reorder/delete |
| `src/app/admin/help/question-list.tsx` | Client Component — question list with search/filter/sort/answer |
| `src/lib/repository/faq.ts` | `getAll()`, `create()`, `update()`, `deleteItem()`, `swapSortOrder()` |
| `src/lib/repository/questions.ts` | `getByPartyId()`, `getAll()`, `create()`, `answer()`, `getStats()` |
| `src/lib/rate-limit.ts` | In-memory sliding-window rate limiter |
| `src/components/rate-limit-form/rate-limit-form.tsx` | Reusable rate limit config form |
| `src/components/char-count.tsx` | Character count display widget |

## Database Tables

### `faq_items`

```sql
CREATE TABLE IF NOT EXISTS faq_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### `questions`

```sql
CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  party_id INTEGER NOT NULL,
  question TEXT NOT NULL,
  answer TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  answered_at TEXT,
  FOREIGN KEY (party_id) REFERENCES parties(id) ON DELETE CASCADE
);
```

`answer` and `answered_at` are `NULL` until the admin responds.

# Admin Dashboard

- **Scope:** Admin panel layout, all management pages

## Overview

The admin dashboard is a set of protected routes under `/admin`. Access is controlled at the layout level — all routes within `/admin/*` require an admin session (`isAdmin()` returns true). Unauthenticated users are redirected to `/login`.

## Layout

The admin layout (`src/app/admin/layout.tsx`) provides:

- **Guard** — Calls `isAdmin()`; redirects to `/login` if not authenticated
- **Sidebar** — Navigation panel with links to all management sections
- **Back to Site** — Link to return to the public site

```
┌────────────────────────────────────────────┐
│  ┌────────────┐  ┌────────────────────────┐│
│  │            │  │                        ││
│  │  Admin     │  │  Dashboard             ││
│  │  Panel     │  │  Description           ││
│  │            │  │                        ││
│  │  ►Dashboard│  │  [Stat Cards]          ││
│  │  Site      │  │  [RSVP Summary Table]  ││
│  │  Parties   │  │                        ││
│  │  Guests    │  │                        ││
│  │  Lodging   │  │                        ││
│  │  Dress Code│  │                        ││
│  │  RSVP      │  │                        ││
│  │  Media     │  │                        ││
│  │            │  │                        ││
│  │  ← Back    │  │                        ││
│  └────────────┘  └────────────────────────┘│
└────────────────────────────────────────────┘
```

## Routes

### `/admin` — Dashboard Overview

The main dashboard page renders:

**Stats Cards** — Three summary metrics:

| Metric | Query |
|---|---|
| Guests | `SELECT COUNT(*) FROM guests` |
| RSVP'd Yes | `SELECT COUNT(*) FROM rsvp_responses WHERE attending = 1` |
| RSVP'd No | `SELECT COUNT(*) FROM rsvp_responses WHERE attending = 0` |

**Recent RSVP Table** — The 10 most recent responses, showing guest name, attendance, and plus one name.

### `/admin/site` — Site Configuration

Editable settings via Server Actions with `revalidatePath`:

| Field | Type | Description |
|---|---|---|
| Landing Title | Text | Main headline on the landing page |
| Landing Background | URL | Full-page background image URL |
| Home Title | Text | Welcome heading on `/home` |
| Home Subtitle | Text | Subtitle text |
| Home Date | Text | Wedding date (displayed prominently) |
| Home Location | Text | Venue name and city |
| Home Background Video | URL | Optional background video for home page |
| Dress Code Text | Textarea | Dress code description displayed on `/dress-code` |

All fields are persisted in the `site_config` table and fetched via `getConfig(key)`.

### `/admin/parties` — Party Management

Parties group guests into households for convenient RSVP. Each party has a unique access code.

| Column | Description |
|---|---|
| Name | Party name (e.g. "The Smith Family") |
| Code | Unique access code (e.g. "SMITH-A1B2"), printed on invitations |
| Members | Number of guests assigned to this party |

**Inline member management** — Each party row shows its members with:
- Display name, type, RSVP status for each member
- Button to add new members
- Button to generate a new access code

### `/admin/guests` — Guest Management

CRUD for guest entries. Each guest belongs to a party:

| Field | Description |
|---|---|
| Display Name | Shown on RSVP form and in admin |
| Party | Party assignment (SearchableSelect with inline creation) |
| Can Bring Plus One | Yes/No — Controls plus one field on RSVP form |

Inline editing — each guest row has editable fields and a "Save" button.

### `/admin/lodging` — Lodging Recommendations

CRUD for hotel/resort recommendations displayed on `/lodging`:

| Field | Description |
|---|---|
| Title | Hotel or resort name |
| Image URL | Photo URL |
| URL | Booking or website link |
| Sort Order | Display order |

### `/admin/dress-code` — Dress Code Images

Image uploads for the dress code mood board on `/dress-code`:

| Field | Description |
|---|---|
| Image URL | Photo URL |
| Sort Order | Display order |

### `/admin/rsvp` — RSVP Response Viewer

Read-only table of all RSVP responses:

| Column | Description |
|---|---|
| Guest | Display name |
| Attending | Yes / No |
| Plus One | Plus one name (if any) |
| Submitted | Timestamp |

### `/admin/media` — Media Gallery

CRUD for photo/video sections on `/media`:

| Field | Description |
|---|---|
| Type | `image` or `video` |
| URL | Media URL |
| Thumbnail URL | Optional thumbnail for videos |
| Title | Display title |
| Section | Section heading (e.g. "Engagement", "Ceremony", "Reception") |
| Sort Order | Display order |

---

## Component Architecture

```
admin/layout.tsx              ← Server Component (guard + sidebar)
  ├── admin/page.tsx           ← Server Component (stats + recent RSVPs)
  ├── admin/site/
  │   ├── page.tsx             ← Server Component
  │   ├── actions.ts           ← Server Actions (updateConfig)
  │   └── site-config-form.tsx ← Client Component
  ├── admin/parties/
  │   ├── page.tsx             ← Server Component
  │   ├── actions.ts           ← Server Actions (CRUD + code gen)
  │   ├── party-list.tsx       ← Client Component
  │   └── party-form.tsx       ← Client Component
  ├── admin/guests/
  │   ├── page.tsx             ← Server Component
  │   ├── actions.ts           ← Server Actions (addGuest, updateGuest)
  │   ├── guest-list.tsx       ← Client Component
  │   └── guest-form.tsx       ← Client Component
  ├── admin/lodging/
  │   ├── page.tsx             ← Server Component
  │   ├── actions.ts           ← Server Actions (CRUD)
  │   ├── lodging-list.tsx     ← Client Component
  │   └── lodging-form.tsx     ← Client Component
  ├── admin/dress-code/
  │   ├── page.tsx             ← Server Component
  │   ├── actions.ts           ← Server Actions (CRUD)
  │   ├── image-list.tsx       ← Client Component
  │   └── image-form.tsx       ← Client Component
  ├── admin/rsvp/
  │   └── page.tsx             ← Server Component (read-only)
  └── admin/media/
      ├── page.tsx             ← Server Component
      ├── actions.ts           ← Server Actions (CRUD)
      ├── media-list.tsx       ← Client Component
      └── media-form.tsx       ← Client Component
```

All admin pages are Server Components. Forms are Client Components using `useActionState` for mutations with `revalidatePath()`.

# Guide Page

- **Scope:** Tabbed information hub combining schedule, dress code, lodging, and gifts

## Overview

The guide page at `/guide` consolidates four separate content domains into a single tabbed page. It is the second-most-important guest-facing page after home.

## Tab Routing

Tabs use the same `?tab=` URL parameter pattern as the media page:

```
/guide              →  Schedule tab (default)
/guide?tab=dress-code  →  Dress Code tab
/guide?tab=lodging     →  Lodging tab
/guide?tab=gifts       →  Gifts tab
```

Tabs are hardcoded in the `TABS` constant (not database-driven like media):

```ts
const TABS = [
  { id: "schedule", label: "Schedule" },
  { id: "dress-code", label: "Dress Code" },
  { id: "lodging", label: "Lodging" },
  { id: "gifts", label: "Gifts" },
] as const;
```

`isValidTab(tab)` validates against this list. Invalid values fall back to `"schedule"`.

## Tab Navigation

Uses WAI-ARIA tab semantics with `<Link>` elements:

```tsx
<nav className="content-tabs" role="tablist" aria-label="Guide sections">
  {TABS.map(tab => (
    <Link
      role="tab"
      aria-selected={activeTab === tab.id}
      aria-controls={`guide-panel-${tab.id}`}
      className={`content-tab${activeTab === tab.id ? " active" : ""}`}
      href={tab.id === "schedule" ? "/guide" : `/guide?tab=${tab.id}`}
    >
      {tab.label}
    </Link>
  ))}
</nav>
```

The default tab (`schedule`) links to `/guide` without a query param. Other tabs use `?tab=`.

## Tabs

### Schedule

A vertical timeline with dots connecting time entries. CSS-only implementation — no JavaScript.

```html
<div class="schedule-timeline">
  <div class="schedule-item">
    <div class="schedule-time">3:00 PM</div>
    <div class="schedule-dot" />
    <div class="schedule-label">Ceremony begins</div>
  </div>
</div>
```

**Layout:** Time (5rem, right-aligned) → dot (12px circle) → label. A vertical `::before` pseudo-element draws the connecting line.

**Empty state:** "Schedule coming soon."

### Dress Code

Two content elements:

1. **Text block** (`.dress-code-text`) — `DRESS_CODE_TEXT_KEY` from site config. Rendered with `white-space: pre-wrap` to preserve line breaks. Max width 650px.
2. **Mood board** — Grid of dress code images with lightbox. Rendered by the `MoodBoard` client component.

Both can exist independently. If neither has content, shows "Dress Code coming soon."

### Lodging

A responsive card grid of hotel/resort recommendations:

```html
<div class="lodging-grid">
  <div class="lodging-card">
    <Image src={option.image_url} alt={option.title} width={600} height={200} />
    <div class="lodging-card-body">
      <h3>{option.title}</h3>
      <a href={option.url} target="_blank" rel="noopener noreferrer">View Details →</a>
    </div>
  </div>
</div>
```

**Layout:** `grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))`. Cards have border, rounded corners, hover lift effect (`translateY(-2px)` + shadow).

**Empty state:** "Lodging options coming soon."

## Mood Board (Client Component)

The mood board (`src/app/(main)/guide/mood-board.tsx`) renders dress code images in a grid with lightbox.

### Grid

```css
mood-board — grid, minmax(200px, 1fr), dense auto-flow
mood-board-item — relative, height 250px, overflow hidden, hover scale(1.02)
```

**Two-item layout:** When there are exactly 2 items, both span 2 columns and get 350px height (via `:first-child:nth-last-child(2)` CSS selector).

### Lightbox

Identical pattern to the media gallery lightbox:

- Plain `<img>` (not `next/image` fill) — `.lightbox-content` has no explicit dimensions
- Focus trap, Escape to close, focus restoration to trigger element
- `role="dialog"` + `aria-modal="true"`
- Uses `img.thumbnail_url || img.image_url` for grid, `img.image_url` for lightbox full view

**Note:** The media gallery and mood board lightboxes are independently implemented. Both follow the same accessibility pattern.

## Server Component Data Orchestration

The guide page is a single Server Component that fetches all data in parallel:

```ts
const scheduleItems = getScheduleItems();
const dressCodeImages = getImages();
const lodgingOptions = getLodgingOptions();
const config = Object.fromEntries(getAllConfig().map((c) => [c.key, c.value]));
const dressCodeText = config[DRESS_CODE_TEXT_KEY] ?? "";
const lodgingText = config[LODGING_TEXT_KEY] ?? "";
const scheduleText = config[SCHEDULE_TEXT_KEY] ?? "";
const giftsText = config[GIFTS_TEXT_KEY] ?? "";
```

All four queries run synchronously (better-sqlite3 is synchronous). The page conditionally renders only the active tab's content.

## Files

| File | Role |
|---|---|
| `src/app/(main)/guide/page.tsx` | Server Component — tab routing, data loading, layout |
| `src/app/(main)/guide/mood-board.tsx` | Client Component — image grid + lightbox |
| `src/lib/repository/schedule.ts` | `getAll()` for schedule items |
| `src/lib/repository/site-config.ts` | `getAllConfig()`, `getConfig()` |
| `src/lib/repository/dress-code.ts` | `getImages()` |
| `src/lib/repository/lodging.ts` | `getAll()` for lodging options |
| `src/app/globals.css` | `.schedule-*`, `.lodging-*`, `.mood-board*`, `.dress-code-text` |

# Media Gallery

- **Scope:** Public-facing photo/video gallery with tab routing and lightbox

## Overview

The media gallery at `/media` is the primary guest-facing media consumption experience. It displays photos and videos organized by database-driven tabs, with a full lightbox overlay for viewing individual items.

The existing `media.md` covers upload, storage, and admin management. This doc covers the public gallery UX.

## Tab Routing

Tabs are driven by the `media_tabs` table. The active tab is controlled by the `?tab=` URL parameter.

```
/media           →  First tab (default redirect)
/media?tab=ceremony  →  "Ceremony" tab
/media?tab=reception →  "Reception" tab
```

**Validation:** `isValidTab(slug, tabs)` checks the slug against known tabs. Invalid slugs fall back to the first tab.

**No tabs configured:** If `media_tabs` is empty, all items render without tab navigation. If items are also empty, a "coming soon" placeholder is shown.

## Grid Layout

Items render in a responsive CSS grid (`.media-gallery`):

```css
grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
```

Each item is a square tile (`aspect-ratio: 1`) with hover zoom (`scale(1.05)`).

### Image Items

Rendered with `next/image` `fill` layout. Uses `thumbnail_url` if available, otherwise the original `url`.

### Video Items

- **With thumbnail:** Renders as `<img>` with the thumbnail, plus a CSS play icon overlay (`.play-icon` — centered semi-transparent circle with `▶` triangle).
- **Without thumbnail:** Renders as `<video muted preload="metadata">` showing the first frame.

### Title Captions

If `item.title` is set, a caption overlay appears at the bottom of the tile with a gradient background (`.media-item-caption`). Always visible, not hover-dependent.

## Lightbox

Clicking any item opens a full-screen lightbox overlay (`.lightbox-overlay`).

### Structure

```tsx
<div className="lightbox-overlay" role="dialog" aria-modal="true" onClick={close}>
  <div className="lightbox-content" onClick={e => e.stopPropagation()}>
    {/* <img> for images, <video controls autoPlay muted> for videos */}
    {title && <div className="lightbox-caption">{title}</div>}
  </div>
  <button className="lightbox-close" onClick={close} aria-label="Close lightbox">×</button>
</div>
```

### Key Design Decisions

- **Plain `<img>` for lightbox content.** `next/image` `fill` requires a sized parent; `.lightbox-content` has no explicit dimensions (it sizes to content via `max-width: 90vw; max-height: 90vh`). Using `<img>` avoids layout issues.
- **`next/image` stays for grid thumbnails** where the parent has explicit sizing (`aspect-ratio: 1`).
- **Videos auto-play muted** in lightbox with controls enabled.

### Accessibility

- **Focus trap:** Tab/Shift+Tab cycles through focusable elements within the overlay. Implemented via `querySelectorAll` for buttons, links, inputs, and `[tabindex]` elements.
- **Escape to close:** Keydown handler on `window`.
- **Focus restoration:** `lastTriggerRef` stores the element that opened the lightbox. On close, focus returns to that element.
- **`role="dialog"` + `aria-modal="true"`:** Identifies the overlay as a modal dialog.
- **Overlay click to close:** Clicking the dark backdrop closes the lightbox. `stopPropagation` on `.lightbox-content` prevents close when clicking inside.

### CSS

```css
.lightbox-overlay  — fixed, inset 0, z-index 100, black 90% opacity, flex center
.lightbox-content  — max-width 90vw, max-height 90vh, relative (for caption positioning)
.lightbox-close    — absolute top-right, circular semi-transparent button
.lightbox-caption  — absolute bottom, gradient background, white text
```

## Files

| File | Role |
|---|---|
| `src/app/(main)/media/page.tsx` | Server Component — loads tabs + items, renders tab nav and gallery |
| `src/app/(main)/media/media-gallery.tsx` | Client Component — grid + lightbox |
| `src/lib/repository/media.ts` | `getAllTabs()`, `getBySection(slug)`, `getAll()` |
| `src/app/globals.css` | `.media-gallery`, `.media-item*`, `.lightbox-*`, `.play-icon` |

## Reuse

The lightbox pattern (focus trap, Escape, focus restoration, `role="dialog"`) is also used by the dress code mood board (`src/app/(main)/guide/mood-board.tsx`). Both are independently implemented — if you need to add lightbox to a new page, follow the same pattern from either file.

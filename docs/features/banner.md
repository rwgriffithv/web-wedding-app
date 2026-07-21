# Banner Text

- **Scope:** Optional site-wide announcement banner with auto-scrolling marquee

## Overview

A fixed-position banner displayed on all authenticated pages (home, RSVP, guide, media, help). Not shown on login or admin pages. The admin configures the text via Site Config; empty text hides the banner entirely.

If the text fits on one screen width, it displays statically. If it overflows, it scrolls horizontally as a seamless marquee. Static "!!" markers frame each edge.

## Rendering

The banner is rendered in `(main)/layout.tsx`, which wraps all authenticated pages:

```
Session check → Read BANNER_TEXT_KEY from site_config → Conditionally render <BannerText>
```

When the banner is active, page content flows naturally underneath since the banner is fixed-position with semi-transparent backdrop blur.

## Overflow Detection

The `BannerText` client component (`src/components/banner-text.tsx`) detects overflow:

```ts
const checkOverflow = useCallback(() => {
  const el = trackRef.current;
  if (el) {
    setOverflowing(el.scrollWidth > el.clientWidth);
  }
}, []);
```

- Checks on mount and on every `window.resize` event
- When `scrollWidth > clientWidth`, adds `banner-scrolling` class to enable the CSS marquee
- When not overflowing, text is static — no animation, no duplicated content

## Marquee Animation

When text overflows, the inner span gets a duplicate of the text:

```html
<span class="banner-inner banner-scrolling">
  <span>{text}</span>
  <span aria-hidden="true">{text}</span>
</span>
```

The CSS animation translates from `0` to `-50%` over 25 seconds:

```css
@keyframes banner-scroll {
  0%   { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
```

The `-50%` shift moves exactly one copy's worth, creating a seamless infinite loop. Hovering pauses the animation.

## CSS

```css
.banner {
  position: fixed;
  top: 0.75rem;
  left: 0;
  right: 0;
  z-index: 100;
  background: rgba(234, 140, 30, 0.7);
  backdrop-filter: blur(4px);
  color: white;
  font-size: 0.95rem;
  padding: 0.5rem 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.banner-edge {
  flex-shrink: 0;
  padding: 0 0.5rem;
  font-weight: 700;
}

.banner-track {
  overflow: hidden;
  flex: 1;
  min-width: 0;
}

.banner-inner {
  display: inline-block;
  white-space: nowrap;
  text-align: center;
}

.banner-scrolling {
  animation: banner-scroll 25s linear infinite;
}

.banner-scrolling:hover {
  animation-play-state: paused;
}
```

| Class | Purpose |
|---|---|
| `.banner` | Fixed overlay at top, semi-transparent orange with backdrop blur |
| `.banner-edge` | Static "!!" markers on each side |
| `.banner-track` | Overflow container for the scrolling text |
| `.banner-inner` | Inline-block, nowrap, centered text |
| `.banner-scrolling` | Applied only when text overflows; enables marquee animation |

## Admin Configuration

**Site Config page** → **Banner** fieldset → textarea for `banner_text`.

| Config Key | Max Length | Default |
|---|---|---|
| `BANNER_TEXT_KEY` (`constants.ts`) | 500 | (empty — no banner) |

Saved via `saveSiteConfig` server action. Revalidates `/admin/site`, `/`, and `/home`.

## Accessibility

- `role="status"` on the banner div — ARIA live region, announced on page load
- First text `<span>` is readable by screen readers
- Duplicate text and "!!" markers have `aria-hidden="true"`
- Hovering pauses the scroll animation for readability

## Files

| File | Role |
|---|---|
| `src/components/banner-text.tsx` | Client Component — overflow detection, marquee rendering |
| `src/app/(main)/layout.tsx` | Server Component — conditional banner rendering |
| `src/app/globals.css` | Banner CSS (`.banner`, `.banner-*`, `@keyframes`) |
| `src/app/admin/site/site-config-form.tsx` | Admin form — banner_text textarea |
| `src/app/admin/site/actions.ts` | `CONFIG_SCHEMA` with `banner_text: { maxLength: 500 }` |
| `src/lib/repository/site-config.ts` | `getConfig(BANNER_TEXT_KEY)`, `setConfigs()` |

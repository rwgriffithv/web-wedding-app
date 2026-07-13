# Home Page Video Poster & Lazy Loading

**Date:** 2026-07-13

## Context

The home page background video (1080p MP4) loaded eagerly with no placeholder. Users saw a blank/black area until the video buffered enough to render the first frame. No `poster` attribute or `preload` hint was set.

## Design Decisions

- **Poster generation reuses existing pipeline** — `ffmpeg-static` extracts the first frame, `sharp` resizes to 1920px width (full-width for hero background) and outputs WebP at quality 80. Same infrastructure as the media thumbnail system.
- **`preload="metadata"`** — Allows the browser to fetch only the video duration and dimensions for layout, without downloading the full video data. The poster displays immediately while the video loads in the background.
- **Poster stored in `site_config`** — New key `home_background_video_poster` stores the poster URL, auto-generated when a local video is saved.
- **GIF rejected** — A 1080p GIF would be 50-100MB with no compression benefit for photographic content.
- **Intersection Observer rejected** — The hero video is above the fold; lazy loading adds complexity with no benefit.

## Blueprint

| File | Change |
|------|--------|
| `src/lib/media.ts` | Added `POSTER_WIDTH` constant and `generateVideoPoster()` function |
| `src/lib/thumbnail.ts` | Added `ensureVideoPoster()` orchestrator function |
| `src/app/admin/site/actions.ts` | Auto-generate poster on video save, import `ensureVideoPoster` |
| `src/app/admin/site/site-config-form.tsx` | Show poster status text when available |
| `src/app/(main)/home/page.tsx` | Added `poster`, `preload="metadata"`, fetch poster from config |

## Compliance

- [x] Reuses existing infrastructure (ffmpeg + sharp pipeline)
- [x] No new dependencies
- [x] No dead code
- [x] Follows existing patterns (site_config key-value store, thumbnail pipeline)
- [x] Server component for home page (no client JS needed for poster)
- [x] Lint and typecheck pass

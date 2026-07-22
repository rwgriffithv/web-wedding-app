# Media

- **Scope:** Self-hosted media storage, file upload, admin management

## Overview

The app supports two ways to add images and videos:

1. **Self-hosted upload** — Upload files from your computer directly to the server. Files are stored in `data/media/` on the deployment machine and served via `/api/media/<filename>`.
2. **External URL** — Paste any URL (Cloudinary, Google Photos, Imgur, etc.). The browser loads the image directly from that URL.

Both options are available in every admin form that accepts an image URL. The `Browse` button opens a file picker and uploads to your own server; the text input still accepts any pasted URL.

## Admin Usage

### Upload a file

1. Navigate to the admin section (e.g. **Media**, **Dress Code**, **Lodging**)
2. Find the image URL text field
3. Click the **Browse** button next to it
4. Select a file from your computer
5. The URL field is automatically filled with `/api/media/<uuid>.<ext>`
6. Submit the form

The text input remains editable — you can modify the URL after upload if needed.

### Supported file types

| Type | Extensions | Max Size |
|---|---|---|
| Images | `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.avif` | Configurable (default 50 MB) |
| Videos | `.mp4`, `.webm`, `.mov` | Configurable (default 50 MB) |

> SVG files are intentionally excluded. Serving `image/svg+xml` enables stored XSS via `<object>`, `<embed>`, or CSS `background-image` contexts.

### Use an external URL

Simply paste any URL into the same text field:

```
https://images.unsplash.com/photo-abc123
https://res.cloudinary.com/your-wedding/image/upload/v1/photo.jpg
```

The admin form does not distinguish between uploaded and external URLs — they are both stored as plain text in the database.

## Where files are stored

```
Host machine:
  ./data/          ← Docker volume (mounted at /app/data)
    sqlite/        ← SQLite database (prod.db)
    media/         ← Uploaded files
      <uuid>.jpg
      <uuid>.mp4
  ./backups/       ← Backup archives (outside Docker volume)
```

The entire `./data/` directory is mounted as a single Docker volume at `/app/data`. The `MEDIA_DIR` environment variable defaults to `data/media` (relative to the app root), which resolves to `/app/data/media` inside the container.

## How files are served

All uploaded files are served via the API route `GET /api/media/<filename>`. This route:

- Validates the filename (basename only — no path traversal)
- Returns the correct `Content-Type` header based on file extension
- Sets `Cache-Control: private, max-age=86400, immutable` (24 hours)
- Sets `X-Content-Type-Options: nosniff` to prevent MIME-sniffing
- Applies per-IP rate limiting (configurable via admin dashboard)
- Returns 401 if no session, 429 if rate limited, 404 if the file does not exist

### Rate Limiting on Media Requests

Both media API routes are rate-limited per IP:

| Endpoint | Rate Limiter | Key | Default Max | Default Window |
|---|---|---|---|---|
| `GET /api/media/[...path]` | `media` | `{ip}:media` | 500 requests | 1 hour (3600s) |
| `GET /api/media/list` | `media_list` | `{ip}:media_list` | 500 requests | 1 hour (3600s) |

Configuration is editable via the **Rate Limiting** section on the admin Media page (`/admin/media`). Changes take effect immediately — `getRateLimitConfig()` reads from `site_config` on every request.

### Why Rate Limiting Doesn't Affect Normal Browsing

Rate limiting only applies to requests that **reach the server**. In practice, browsers serve media from their local HTTP cache, so rate limits are almost never hit during normal use:

1. **First visit:** Browser requests the image. Server serves it with `Cache-Control: private, max-age=86400, immutable`. The response is stored in the browser's HTTP cache (disk).
2. **Subsequent visits (within 24 hours):** Browser serves the image directly from its local HTTP cache. **No request is made to the server.** The rate limiter is never consulted.
3. **After 24 hours:** Browser revalidates with the server. A new request hits the server, the rate limiter checks the key, and a fresh response with a new 24-hour cache header is returned.

The rate limiter only fires when the browser actually contacts the server — which happens at most once per 24 hours per file per client under normal conditions. This means:

- **Normal browsing** (clicking through the gallery, viewing photos) does not consume rate limit tokens — images are served from disk cache.
- **Aggressive scraping** (repeated `curl` requests, scripts fetching the same file without caching) will hit the rate limit because each request reaches the server.
- **Admin browsing** (loading the media list endpoint repeatedly in the admin dashboard) is rate-limited separately via the `media_list` limiter, but the admin panel itself does not re-fetch the list on every interaction.

This is by design: the rate limiter protects the server from abuse, not from legitimate cached browsing.

## Authentication

Admin-only. Uses `requireSession("admin")` check in server actions and API routes.

### Security Notes

- **Rate limiting on file serving:** Both `GET /api/media/[...path]` and `GET /api/media/list` are rate-limited per IP. Default: 500 requests per 3600-second (1 hour) window. Configurable via admin Media page. The 1-hour window is designed for shared IPs (e.g. venue WiFi) where many guests load images. In practice, browser HTTP caching (`Cache-Control: private, max-age=86400, immutable`) means normal browsing almost never hits the rate limit — images are served from disk cache, not re-fetched from the server.
- **No rate limiting on upload:** Admin-only endpoint; admins are trusted users. Rate limiting is unnecessary for trusted roles.
- **No MIME/magic-byte validation:** Extension-based validation only. Admins are trusted not to upload malicious files.
- **SVG excluded:** Serving SVGs enables stored XSS via `<object>`, `<embed>`, or CSS contexts.
- **Streaming upload:** Files are piped to disk via `stream.pipeline()`, not buffered in memory.
- **`X-Content-Type-Options: nosniff`** set on all file-serving responses to prevent browser MIME-sniffing.

## Backup

The `./backup.sh` script archives the `./data/` directory to `./backups/` (outside the Docker volume), so your database and uploaded media survive `docker compose down -v`.

Restore:

```bash
# List available backups
ls backups/db_backup_*.tar.gz

# Verify integrity
sha256sum -c backups/db_backup_20260703_120000.tar.gz.sha256

# Extract — restores data/ directory
tar -xzf backups/db_backup_20260703_120000.tar.gz -C .
```

The archive preserves the `data/` directory structure: `data/sqlite/`, `data/media/`, etc.

## API Reference

### `POST /api/upload`

Upload a file. Requires admin session.

| Field | Type | Required | Description |
|---|---|---|---|
| `file` | File | Yes | The file to upload |

**Response (200):**
```json
{ "success": true, "data": { "url": "/api/media/550e8400-e29b-41d4-a716-446655440000.jpg", "type": "image" } }
```

**Response (401/400/413):**
```json
{ "success": false, "error": "Unauthorized" }
{ "success": false, "error": "File type \".exe\" is not allowed." }
{ "success": false, "error": "File exceeds size limit." }
```

### `GET /api/media/[...path]`

Serve a file. Requires a valid session (`requireSession()`). Rate-limited per IP.

**Rate Limit Key:** `{ip}:media`

**Response (200):** File content with `Content-Type`, `Cache-Control: private, max-age=86400, immutable`, `X-Content-Type-Options: nosniff`.

**Response (401):**
```json
{ "error": "Unauthorized" }
```

**Response (429):**
```json
{ "error": "Too many requests. Please wait before trying again." }
```
Includes `Retry-After` header with seconds until the rate limit window expires.

**Response (404):**
```json
{ "error": "Not found." }
```

### `GET /api/media/list`

List files and subdirectories in the media directory. Requires admin session (`requireSession("admin")`). Rate-limited per IP.

**Rate Limit Key:** `{ip}:media_list`

**Query Parameters:**

| Param | Type | Required | Description |
|---|---|---|---|
| `path` | string | No | Subdirectory path (defaults to root media dir) |

**Response (200):**
```json
{ "success": true, "data": { "path": "", "dirs": ["subfolder"], "files": ["image.jpg"] } }
```

**Response (429):**
```json
{ "error": "Too many requests. Please wait before trying again." }
```
Includes `Retry-After` header with seconds until the rate limit window expires.

## Relevant Files

| File | Purpose |
|---|---|
| `src/lib/media.ts` | Media directory configuration, lazy `ensureMediaDir()` helper |
| `src/app/api/upload/route.ts` | Upload endpoint (admin-only) |
| `src/app/api/media/[...path]/route.ts` | File serving endpoint (session auth + rate limiting) |
| `src/app/api/media/list/route.ts` | Directory listing endpoint (admin auth + rate limiting) |
| `src/components/file-upload.tsx` | Reusable upload button component |
| `src/app/admin/media/media-form.tsx` | Media admin form with file upload |
| `src/app/admin/media/media-settings-form.tsx` | Media settings form (max upload size, cache TTL) |
| `src/app/admin/dress-code/image-form.tsx` | Dress code form with file upload |
| `src/app/admin/lodging/lodging-form.tsx` | Lodging form with file upload |
| `src/components/rate-limit-form/` | Reusable rate limit config form (used on admin Media page) |
| `web-deploy-env/templates/docker-compose.yml` | Single volume mount `./data:/app/data` (sqlite + media); `MEDIA_DIR` env var |
| `web-deploy-env/scripts/deploy.sh` | Creates `./data/sqlite` and `./data/media` before deploy |
| `web-deploy-env/scripts/backup.sh` | Archives `./data/` to `./backups/` (outside Docker volume) |

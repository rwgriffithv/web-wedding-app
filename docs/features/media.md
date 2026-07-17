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
| Images | `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.svg` | 50 MB |
| Videos | `.mp4`, `.webm`, `.mov` | 50 MB |

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
- Sets `Cache-Control: public, max-age=31536000, immutable` (1 year)
- Returns 404 if the file does not exist

## Authentication

Admin-only. Uses `requireAdminSessionOrNull()` check in server actions.

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
{ "url": "/api/media/550e8400-e29b-41d4-a716-446655440000.jpg" }
```

**Response (401/400):**
```json
{ "error": "Unauthorized" }
{ "error": "File type \".exe\" is not allowed." }
{ "error": "File exceeds 50 MB limit." }
```

### `GET /api/media/[...path]`

Serve a file. Requires a valid session (`requireSession()`).

**Response (200):** File content with `Content-Type`, `Cache-Control: public, max-age=31536000, immutable`.

**Response (401):**
```json
{ "error": "Unauthorized" }
```

**Response (404):**
```json
{ "error": "Not found." }
```

## Relevant Files

| File | Purpose |
|---|---|
| `src/lib/media.ts` | Media directory configuration, lazy `ensureMediaDir()` helper |
| `src/app/api/upload/route.ts` | Upload endpoint (admin-only) |
| `src/app/api/media/[...path]/route.ts` | File serving endpoint (session auth required) |
| `src/components/file-upload.tsx` | Reusable upload button component |
| `src/app/admin/media/media-form.tsx` | Media admin form with file upload |
| `src/app/admin/dress-code/image-form.tsx` | Dress code form with file upload |
| `src/app/admin/lodging/lodging-form.tsx` | Lodging form with file upload |
| `web-deploy-env/templates/docker-compose.yml` | Single volume mount `./data:/app/data` (sqlite + media); `MEDIA_DIR` env var |
| `web-deploy-env/scripts/deploy.sh` | Creates `./data/sqlite` and `./data/media` before deploy |
| `web-deploy-env/scripts/backup.sh` | Archives `./data/` to `./backups/` (outside Docker volume) |

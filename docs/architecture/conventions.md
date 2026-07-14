# Codebase Conventions

Naming rules, return types, error handling, and structural patterns used across repository and action layers.

---

## Naming Conventions by Layer

### Repository Functions (`src/lib/repository/`)

SQL-layer functions that map directly to database operations. Use **CRUD verbs**.

| Pattern | Purpose | Examples |
|---|---|---|
| `create*(...)` | INSERT, returns the new row | `create()`, `createParty()`, `createUser()`, `createGuest()`, `createTab()`, `createImage()` |
| `get*()` / `getAll*()` | SELECT single or many, returns typed row(s) | `getAll()`, `getById()`, `getAllGuests()`, `getImages()`, `getResponseByGuest()` |
| `update(id, data)` | UPDATE fields, returns `void` | `update()`, `updateUser()`, `updateGuest()`, `updateParty()`, `updateTab()` |
| `delete*(id)` | DELETE, returns `void` | `deleteItem()`, `deleteParty()`, `deleteGuest()`, `deleteUser()`, `deleteTab()`, `deleteImage()` |
| `deleteEmpty*(id)` | Conditional DELETE | `deleteEmptyParty()` |
| `delete*(parentId)` | Bulk DELETE by parent | `deleteUsersByPartyId()` |
| `swap*SortOrder(a, b)` | Transactional position swap | `swapSortOrder()`, `swapItemSortOrder()`, `swapTabSortOrder()` |
| `setConfig(k, v)` | Key-value upsert (site_config) | `setConfig()` |
| `recordLogin(id)` | Side-effect update | `recordLogin()`, `incrementPageViews()` |

**Repository layer: never use `remove`** — always `delete*`. The `remove*` verb is valid in the action layer (e.g. `removeUser`, `removeGuest`, `removeParty`) but never in the repository layer.

### Server Actions (`src/app/admin/*/actions.ts`)

User-facing mutation handlers. Use **domain verbs** that describe the user's intent.

| Pattern | Purpose | Examples |
|---|---|---|
| `add*(formData)` | Create a new entity | `addItem()`, `addOption()`, `addImage()`, `addUser()`, `addGuest()` |
| `update*(formData)` | Modify an existing entity | `updateItem()`, `updateOption()`, `updateGuest()`, `updateUser()`, `updateParty()` |
| `remove*(formData)` | Remove an entity (alternative) | `removeUser()`, `removeGuest()`, `removeParty()` |
| `delete*(formData)` | Remove an entity | `deleteItem()`, `deleteOption()`, `deleteTab()`, `deleteImage()` |
| `move*(formData)` | Reorder via up/down | `moveItem()`, `moveTab()`, `moveOption()` |
| `save*(formData)` | Persist config or settings | `saveSiteConfig()` |
| `rename*(formData)` | Change display name/slug | `renameTab()` |
| `create*Inline(formData)` | Create + return ID for immediate UI use | `createTabInline()`, `createPartyInline()` |
| `submit*(formData)` | Submit a response or form | `submitRsvp()` |

### Why They Differ

**Actions use domain verbs** (`add`, `save`, `move`) because they describe what the *user* is doing — adding a photo, saving settings, moving an item up.

**Repository functions use CRUD verbs** (`create`, `update`, `delete`) because they describe what the *database* is doing — inserting a row, updating fields, deleting a record.

The same entity can have different names at each layer:

```
addImage (action)  →  createImage (repo)
deleteImage (action)  →  deleteImage (repo)
deleteOption (action)  →  deleteOption (repo)
```

When an action name collides with a repo name in the same import scope, alias the repo import:

```typescript
import { deleteItem as deleteItemRepo } from "@/lib/repository/media";
// ...
deleteItemRepo(id);
```

---

## Return Types

### Repository Functions

| Operation | Returns |
|---|---|
| `create*(...)` | The new row (typed interface) |
| `get*(...)` | Typed row or `undefined` |
| `getAll*()` | Array of typed rows |
| `update(...)` | `void` |
| `delete*(...)` | `void` |
| `swap*SortOrder(...)` | `void` |
| `setConfig(...)` | `void` |

**Never return the updated row from `update*`** — no caller uses the return value.

### Server Actions

All actions return a state object (not raw data):

```typescript
interface SomeState { success?: boolean; error?: string; /* optional extra fields */ }
```

Every action follows the same signature:

```typescript
export async function someAction(prevState: SomeState | null, formData: FormData): Promise<SomeState>
```

Common patterns:

```typescript
// Auth check
if (!(await isAdmin())) return { success: false, error: "Unauthorized" };

// Validation
const id = getInt(formData, "id");
if (id === null) return { success: false, error: "Invalid ID." };

// Success
return { success: true };

// Error (caught)
return { success: false, error: "Failed to do something." };
```

---

## Error Handling

### Repository Layer

**Throws on not-found.** Every `update*`, `delete*`, and `swap*` function throws `Error` if the row doesn't exist:

```typescript
const result = db.prepare("UPDATE ... WHERE id = ?").run(...values);
if (result.changes === 0) throw new Error(`Entity ${id} not found`);
```

This is intentional — callers (actions) wrap in try/catch and return `{ success: false, error }` to the UI.

### Action Layer

**Catches and returns.** Every action wraps repo calls in try/catch:

```typescript
try {
  someRepo(id);
  revalidatePath("/admin/some-page");
  return { success: true };
} catch (error) {
  console.error(error);
  return { success: false, error: "Failed to do something." };
}
```

---

## Transaction Patterns

### When to Wrap in a Transaction

| Pattern | Transaction? | Why |
|---|---|---|
| `create*` with auto sort_order | Yes | Read max + insert must be atomic |
| `delete*` with thumbnail cleanup | Yes | Read thumbnail + delete row must be atomic |
| `swap*SortOrder` | Yes | Two UPDATEs must both succeed |
| `delete*Tab` (cascading) | Yes | Delete items + delete tab must be atomic |
| `update*` with side effects | Yes | Update row + update related entity must be atomic |
| Simple `update*` (single UPDATE) | No | Single statement is already atomic |
| Simple `delete*` (single DELETE) | No | Single statement is already atomic |

### Pattern

```typescript
export function deleteOption(id: number): void {
  const db = getDb();
  db.transaction(() => {
    const item = db.prepare("SELECT ...").get(id);
    if (!item) throw new Error(`Entity ${id} not found`);
    // cleanup
    db.prepare("DELETE FROM ... WHERE id = ?").run(id);
  })();
}
```

Note the `()` invocation — `db.transaction()` returns a function that must be called.

---

## Thumbnail Cleanup

Entities with `thumbnail_url` columns (`media_items`, `lodging_options`, `dress_code_images`) must delete thumbnail files from disk when the entity is deleted.

```typescript
function deleteThumbnail(thumbnailUrl: string | null): void {
  if (!thumbnailUrl || !thumbnailUrl.startsWith("/api/media/thumbnails/")) return;
  const filename = thumbnailUrl.replace("/api/media/thumbnails/", "");
  fs.promises.unlink(path.join(THUMBNAILS_DIR, filename))
    .catch((err) => { console.warn("Failed to delete thumbnail:", err); });
}
```

Called inside the delete transaction, before the DELETE statement. Failures are caught and logged — thumbnail cleanup should never block entity deletion.

---

## CSS Conventions

**No Tailwind CSS.** This project uses hand-crafted CSS utility classes defined in `src/app/globals.css`. Do not use Tailwind class names — they will have no effect. When converting inline styles, use only the utility classes that exist in `globals.css` (e.g. `.flex-row`, `.gap-2`, `.mb-2`, `.text-sm`, `.cursor-pointer`). If a needed utility doesn't exist, add it to the `/* Utility Classes */` section at the bottom of `globals.css`.

**Inline styles are acceptable** when:
- Referencing CSS custom properties: `style={{ color: "var(--color-muted)" }}`, `style={{ borderRadius: "var(--radius)" }}`
- Setting dynamic values: `style={{ width: computedWidth }}`, `style={{ objectFit: "cover" }}`
- Using Next.js Image props that require inline: `style={{ objectFit: "cover" }}`

Convert to utility classes only when the style is **static and reusable** (e.g. `marginBottom: "1rem"` → `className="mb-2"`). Do not create utility classes for one-off values or values that depend on CSS variables.

### Full-Screen Sections
Use `100dvh` with `100vh` fallback for full-screen sections (home hero, landing):
```css
.min-h-screen { min-height: 100dvh; min-height: 100vh; }
```

### Safe Area (Safari iOS)
Use `env(safe-area-inset-bottom)` for home indicator clearance on notch devices:
```css
margin-bottom: 2rem;
margin-bottom: calc(2rem + env(safe-area-inset-bottom, 0px));
```

### Backdrop Filter
Always include `-webkit-backdrop-filter` alongside unprefixed version:
```css
-webkit-backdrop-filter: blur(10px);
backdrop-filter: blur(10px);
```

### Mobile Breakpoint
- **640px** — Used for mobile-specific adjustments. Avoid 768px (reserved for admin sidebar).
- Use `@media (max-width: 640px)` for phone-specific overrides.

### Admin Form CSS
- Admin-only forms use `.admin-form` for consistent left-aligned labels
- Admin forms use `.admin-fieldset` for the 3-fieldset layout (Login, Home, RSVP)

---

## File Organization

```
src/app/admin/{entity}/
├── page.tsx          # Server Component — reads data, renders layout
├── actions.ts        # Server Actions — auth, validation, mutations
├── {entity}-form.tsx # Client Component — form with useActionState (if needed)
├── {entity}-list.tsx # Client Component — list with inline editing (if needed)
└── __tests__/
    └── {entity}-form.test.tsx

src/components/
├── {component}.tsx
└── __tests__/
    └── {component}.test.tsx

src/lib/repository/
├── {entity}.ts       # SQL queries, typed returns, transactions
└── __tests__/
    └── {entity}.test.ts
```

- `page.tsx` imports from `repository/` directly (Server Component, no client boundary)
- `actions.ts` imports from `repository/` (Server Actions, also server-only)
- `*-form.tsx` and `*-list.tsx` use `"use client"` — never import from `repository/` directly; they call actions

### Test Files

All test files go in `__tests__/` subdirectories, never colocated with source files. This keeps source directories clean and applies consistently across all layers of the codebase.

- Component tests: `src/components/__tests__/{component}.test.tsx`
- Route tests: `src/app/(main)/{route}/__tests__/{component}.test.tsx`
- Admin route tests: `src/app/admin/{entity}/__tests__/{entity}-form.test.tsx`
- Repository tests: `src/lib/repository/__tests__/{entity}.test.ts`
- Library tests: `src/lib/__tests__/{module}.test.ts`

Tests import from their sibling directory using `../` relative paths. Vitest picks up `*.test.ts(x)` files from anywhere in the project.

## Database Migrations

**Never put migration code in the webapp or deploy scripts.** Migrations are manual operator tasks, like backups.

- Write idempotent scripts in `scripts/migrate-*.sh`
- Run them manually on the production server **before** deploying: `./scripts/migrate-<name>.sh`
- Each script backs up the DB, runs `ALTER TABLE`, and logs what it did
- `deploy.sh` only builds and restarts — it does not touch the database schema
- `db.ts` uses `CREATE TABLE IF NOT EXISTS` — it creates new tables but never alters existing ones
- `scripts/db-seed.ts` runs DDL and includes idempotent column migrations for dev/test databases (only adds missing columns, never drops or modifies existing ones)

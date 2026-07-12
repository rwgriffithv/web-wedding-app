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
| `save*(formData)` | Persist config or settings | `saveSiteConfig()`, `saveDressCodeText()` |
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

## File Organization

```
src/app/admin/{entity}/
├── page.tsx          # Server Component — reads data, renders layout
├── actions.ts        # Server Actions — auth, validation, mutations
├── {entity}-form.tsx # Client Component — form with useActionState (if needed)
└── {entity}-list.tsx # Client Component — list with inline editing (if needed)

src/lib/repository/
├── {entity}.ts       # SQL queries, typed returns, transactions
└── __tests__/
    └── {entity}.test.ts
```

- `page.tsx` imports from `repository/` directly (Server Component, no client boundary)
- `actions.ts` imports from `repository/` (Server Actions, also server-only)
- `*-form.tsx` and `*-list.tsx` use `"use client"` — never import from `repository/` directly; they call actions

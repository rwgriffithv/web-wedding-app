# SearchableSelect

- **Scope:** Reusable WAI-ARIA combobox with search, keyboard navigation, and inline creation

## Overview

`SearchableSelect` (`src/components/searchable-select.tsx`) is a client component that provides a text input with a dropdown listbox. Users type to filter options, navigate with arrow keys, and select with Enter. An optional "Create new" option allows inline entity creation.

Used in:
- **Party selection** — guest and user admin forms
- **Media tab selection** — media admin form

## Props

```ts
interface SearchableSelectProps {
  options: { value: number; label: string }[];
  value: number | null;
  onChange: (value: number | null) => void;
  onCreateNew?: (searchText: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  label?: string;
}
```

| Prop | Purpose |
|---|---|
| `options` | List of selectable items (`{ value: number, label: string }`) |
| `value` | Currently selected value (`null` = none) |
| `onChange` | Called when user selects an option or clears the selection |
| `onCreateNew` | If provided, a "Create new" option appears when search text matches no existing option |
| `label` | Accessible label for the input (also used as listbox label) |

## Behavior

### Opening

The dropdown opens on:
- **Focus** — `onFocus` triggers `setIsOpen(true)`
- **ArrowDown/ArrowUp** — when closed, opens with highlight on first/last item

### Filtering

Case-insensitive substring match:

```ts
const filtered = options.filter(o =>
  o.label.toLowerCase().includes(search.toLowerCase())
);
```

Filtering happens on every keystroke. The highlight resets to -1 (no highlight) when typing.

### "Create New" Option

Appears at the bottom of the list when:
1. `onCreateNew` prop is provided
2. Search text is non-empty
3. No existing option's label exactly matches the search text (case-insensitive)

Shows `Create new: "<search text>"`. Selecting it calls `onCreateNew(searchText)` and closes the dropdown.

### Selection

- **Click** — selects the item, closes dropdown
- **Enter** — selects the highlighted item, closes dropdown
- **Escape** — closes dropdown, returns focus to input

### Closing

- Click outside (via `mousedown` listener on `document`)
- Escape key
- Selection made

On close, search text resets and highlight clears.

## Keyboard Navigation

| Key | Closed | Open |
|---|---|---|
| ArrowDown | Opens dropdown, highlights first item | Moves highlight down |
| ArrowUp | Opens dropdown, highlights last item | Moves highlight up |
| Home | — | Highlights first item |
| End | — | Highlights last item |
| Enter | — | Selects highlighted item |
| Escape | — | Closes dropdown, focuses input |

## Accessibility (WAI-ARIA)

Built following the [W3C APG editable combobox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/).

| Attribute | Element | Value |
|---|---|---|
| `role="combobox"` | `<input>` | Identifies as combobox |
| `aria-expanded` | `<input>` | `true`/`false` based on dropdown state |
| `aria-autocomplete="list"` | `<input>` | Indicates listbox suggestions |
| `aria-controls` | `<input>` | Points to listbox `id` |
| `aria-activedescendant` | `<input>` | Points to highlighted option `id` |
| `aria-haspopup="listbox"` | `<input>` | Indicates popup listbox |
| `role="listbox"` | `<ul>` | The dropdown list |
| `role="option"` | `<li>` | Each dropdown item |
| `aria-selected` | `<li>` | `true` for currently selected option |

**Stable IDs:** `useId()` generates `listboxId` and `optionIdPrefix` to ensure `aria-controls` and `aria-activedescendant` link correctly across renders without hydration mismatches.

**No results state:** When filtering produces zero items, a `<li role="presentation">No matches</li>` is rendered.

## Focus Management

- **Click outside to close:** `mousedown` listener on `document` checks `containerRef.contains(e.target)`.
- **Input focus:** The input always retains focus while the dropdown is open. Arrow keys and Enter are handled via `onKeyDown` on the input.
- **No focus trap:** Unlike the lightbox, the combobox does not trap focus — it's an inline form element, not a modal.

## Integration Pattern

### Party Selection

```tsx
<SearchableSelect
  options={parties.map(p => ({ value: p.id, label: p.name }))}
  value={partyId}
  onChange={setPartyId}
  onCreateNew={(name) => createPartyInline(name)}
  label="Party"
/>
```

`createPartyInline` is a server action that creates the party and returns the new ID. The parent form handles the async result.

### Media Tab Selection

```tsx
<SearchableSelect
  options={tabs.map(t => ({ value: t.id, label: t.label }))}
  value={tabId}
  onChange={setTabId}
  onCreateNew={(label) => createTabInline(label)}
  label="Tab"
/>
```

Same pattern — `createTabInline` creates the tab and returns `{ tabId, slug }`.

## Files

| File | Role |
|---|---|
| `src/components/searchable-select.tsx` | Component implementation |
| `src/app/globals.css` | `.searchable-select*` styles |
| `src/app/admin/guests/guest-list.tsx` | Uses for party selection |
| `src/app/admin/users/user-form.tsx` | Uses for party selection |
| `src/app/admin/media/media-form.tsx` | Uses for tab selection |

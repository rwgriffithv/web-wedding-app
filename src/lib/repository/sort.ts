import type Database from "better-sqlite3";

const ALLOWED_TABLES = new Set([
  "faq_items",
  "lodging_options",
  "schedule_items",
  "dress_code_images",
]);

/**
 * Atomic sort-order swap for a single-column sortable list.
 *
 * Reads the current item and its neighbor (up or down) inside a transaction,
 * then swaps their `sort_order` values. The transaction prevents TOCTOU races
 * where two concurrent requests could observe the same neighbor and produce
 * duplicate sort orders.
 *
 * @param db     - Database instance (from `getDb()`)
 * @param table  - Table name (must be in ALLOWED_TABLES)
 * @param id     - ID of the item to move
 * @param direction - "up" (toward lower sort_order) or "down" (toward higher)
 * @param notFoundMessage - Error message when item not found (defaults to "Swap item not found.")
 * @returns `{ success: true }` on success, or `{ success: false, error: string }` on failure
 */
export function swapSortOrder(
  db: Database.Database,
  table: string,
  id: number,
  direction: "up" | "down",
  notFoundMessage = "Swap item not found.",
): { success: boolean; error?: string } {
  if (!ALLOWED_TABLES.has(table)) {
    return { success: false, error: `Invalid table: ${table}` };
  }
  let result: { success: boolean; error?: string } = { success: false, error: notFoundMessage };
  db.transaction(() => {
    const items = db.prepare(`SELECT id, sort_order FROM ${table} ORDER BY sort_order, id`).all() as Array<{ id: number; sort_order: number }>;
    const index = items.findIndex(i => i.id === id);
    if (index === -1) return;

    const neighborIndex = direction === "up" ? index - 1 : index + 1;
    if (neighborIndex < 0 || neighborIndex >= items.length) {
      result = { success: false, error: direction === "up" ? "Already at top." : "Already at bottom." };
      return;
    }

    const current = items[index];
    const neighbor = items[neighborIndex];
    db.prepare(`UPDATE ${table} SET sort_order = ? WHERE id = ?`).run(neighbor.sort_order, current.id);
    db.prepare(`UPDATE ${table} SET sort_order = ? WHERE id = ?`).run(current.sort_order, neighbor.id);
    result = { success: true };
  })();
  return result;
}

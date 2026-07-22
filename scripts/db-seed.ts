import Database from "better-sqlite3";
import path from "path";
import { DDL } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth";
import {
  MEDIA_MAX_FILE_SIZE_MB_KEY, MEDIA_MAX_FILE_SIZE_MB_DEFAULT, MEDIA_MAX_FILE_SIZE_TTL_SECONDS_KEY, MEDIA_MAX_FILE_SIZE_TTL_SECONDS_DEFAULT,
  LOGIN_RATE_LIMIT_MAX_KEY, AUTO_BAN_LOGIN_THRESHOLD_KEY, AUTO_BAN_WINDOW_SECONDS_KEY, LOGIN_RATE_LIMIT_WINDOW_SECONDS_KEY,
  SUSPICIOUS_IP_THRESHOLD_KEY, SESSION_MAX_HOURS_KEY, SESSION_MAX_HOURS_DEFAULT,
  PAGE_VIEW_DEBOUNCE_MINUTES_KEY, PAGE_VIEW_DEBOUNCE_MINUTES_DEFAULT,
  SUSPICIOUS_THRESHOLD_DEFAULT, RSVP_RATE_LIMIT_MAX_KEY, RSVP_RATE_LIMIT_WINDOW_SECONDS_KEY, RSVP_RATE_LIMIT_MAX_DEFAULT, RSVP_RATE_LIMIT_WINDOW_SECONDS_DEFAULT,
  LOGIN_RATE_LIMIT_MAX_DEFAULT, LOGIN_RATE_LIMIT_WINDOW_SECONDS_DEFAULT, QUESTION_RATE_LIMIT_MAX_KEY, QUESTION_RATE_LIMIT_WINDOW_SECONDS_KEY, QUESTION_RATE_LIMIT_MAX_DEFAULT, QUESTION_RATE_LIMIT_WINDOW_SECONDS_DEFAULT,
  MEDIA_RATE_LIMIT_MAX_KEY, MEDIA_RATE_LIMIT_WINDOW_SECONDS_KEY, MEDIA_RATE_LIMIT_MAX_DEFAULT, MEDIA_RATE_LIMIT_WINDOW_SECONDS_DEFAULT,
  LANDING_TITLE_KEY, LANDING_BACKGROUND_KEY,
  HOME_TITLE_KEY, HOME_DATE_KEY, HOME_TIME_KEY, HOME_VENUE_KEY, HOME_LOCATION_KEY, HOME_BACKGROUND_VIDEO_KEY, HOME_BACKGROUND_VIDEO_POSTER_KEY,
  BANNER_TEXT_KEY,
} from "../src/lib/constants";

const dbPath = process.env.DATABASE_URL?.replace(/^file:/, "") || path.join(process.cwd(), "data", "dev.db");

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

const adminUsername = process.env.ADMIN_USERNAME || "admin";
const adminPassword = process.env.ADMIN_PASSWORD || "admin";

db.exec(DDL);

// Idempotent schema migrations for existing databases (mirrors scripts/migrate.sh)
function columnExists(table: string, col: string): boolean {
  const cols = db.pragma(`table_info(${table})`) as { name: string }[];
  return cols.some(c => c.name === col);
}

if (!columnExists("users", "password_changed_at")) {
  db.exec("ALTER TABLE users ADD COLUMN password_changed_at TEXT");
}
if (!columnExists("users", "last_page_view_at")) {
  db.exec("ALTER TABLE users ADD COLUMN last_page_view_at TEXT");
}
if (!columnExists("parties", "invited")) {
  db.exec("ALTER TABLE parties ADD COLUMN invited INTEGER NOT NULL DEFAULT 0");
}
if (!columnExists("guests", "unexpected")) {
  db.exec("ALTER TABLE guests ADD COLUMN unexpected INTEGER NOT NULL DEFAULT 0");
}

// faq_items and questions tables are already created by DDL above

const insertConfig = db.prepare("INSERT OR IGNORE INTO site_config (key, value) VALUES (?, ?)");
const upsertConfig = db.prepare("UPDATE site_config SET value = ? WHERE key = ?");
const setConfig = (key: string, value: string) => {
  insertConfig.run(key, value);
  upsertConfig.run(value, key);
};

// Always reset rate-limit config and clear ban/violation state.
// This prevents E2E tests from self-banning due to parallel workers
// exhausting the threshold during concurrent login attempts.
setConfig(LOGIN_RATE_LIMIT_MAX_KEY, "100");
setConfig(LOGIN_RATE_LIMIT_WINDOW_SECONDS_KEY, "60");
setConfig(AUTO_BAN_LOGIN_THRESHOLD_KEY, "50");
setConfig(AUTO_BAN_WINDOW_SECONDS_KEY, "3600");

db.exec("DELETE FROM banned_ips");
db.exec("DELETE FROM rate_limit_violations");

// Ensure default config values exist for existing databases (only fills empty/null values)
const upsertIfEmpty = db.prepare("UPDATE site_config SET value = ? WHERE key = ? AND (value IS NULL OR value = '')");
const defaults: [string, string][] = [
  [LANDING_TITLE_KEY, "We're Getting Married!"],
  [LANDING_BACKGROUND_KEY, ""],
  [HOME_TITLE_KEY, "Our Wedding"],
  [HOME_DATE_KEY, "2026-08-15"],
  [HOME_TIME_KEY, "15:00"],
  [HOME_VENUE_KEY, ""],
  [HOME_LOCATION_KEY, "Venue Name, City"],
  [HOME_BACKGROUND_VIDEO_KEY, ""],
  [HOME_BACKGROUND_VIDEO_POSTER_KEY, ""],
  [BANNER_TEXT_KEY, ""],
  ["dress_code_text", "Please dress in formal attire. Our wedding will feature a black-tie optional dress code. We recommend suits and cocktail dresses."],
  ["schedule_text", ""],
  ["lodging_text", ""],
  ["gifts_text", ""],
  ["rsvp_deadline", ""],
  [MEDIA_MAX_FILE_SIZE_MB_KEY, String(MEDIA_MAX_FILE_SIZE_MB_DEFAULT)],
  [MEDIA_MAX_FILE_SIZE_TTL_SECONDS_KEY, String(MEDIA_MAX_FILE_SIZE_TTL_SECONDS_DEFAULT)],
  [SESSION_MAX_HOURS_KEY, String(SESSION_MAX_HOURS_DEFAULT)],
  [PAGE_VIEW_DEBOUNCE_MINUTES_KEY, String(PAGE_VIEW_DEBOUNCE_MINUTES_DEFAULT)],
  [SUSPICIOUS_IP_THRESHOLD_KEY, String(SUSPICIOUS_THRESHOLD_DEFAULT)],
  [RSVP_RATE_LIMIT_MAX_KEY, String(RSVP_RATE_LIMIT_MAX_DEFAULT)],
  [RSVP_RATE_LIMIT_WINDOW_SECONDS_KEY, String(RSVP_RATE_LIMIT_WINDOW_SECONDS_DEFAULT)],
  [QUESTION_RATE_LIMIT_MAX_KEY, String(QUESTION_RATE_LIMIT_MAX_DEFAULT)],
  [QUESTION_RATE_LIMIT_WINDOW_SECONDS_KEY, String(QUESTION_RATE_LIMIT_WINDOW_SECONDS_DEFAULT)],
  [MEDIA_RATE_LIMIT_MAX_KEY, String(MEDIA_RATE_LIMIT_MAX_DEFAULT)],
  [MEDIA_RATE_LIMIT_WINDOW_SECONDS_KEY, String(MEDIA_RATE_LIMIT_WINDOW_SECONDS_DEFAULT)],
];
for (const [key, value] of defaults) {
  insertConfig.run(key, value);
  upsertIfEmpty.run(value, key);
}

const existingParty = db.prepare("SELECT COUNT(*) as count FROM parties WHERE code = ?").get("DEMO-1234") as { count: number };

if (existingParty.count === 0) {
  const seed = db.transaction(() => {
    const insertParty = db.prepare("INSERT INTO parties (name, code) VALUES (?, ?)");
    const partyResult = insertParty.run("Demo Family", "DEMO-1234");
    const partyId = partyResult.lastInsertRowid as number;

    const insertPartyUser = db.prepare("INSERT OR IGNORE INTO users (username, password, display_name, type, party_id) VALUES (?, ?, ?, ?, ?)");
    insertPartyUser.run("DEMO-1234", hashPassword("DEMO-1234"), "Demo Family", "party", partyId);

    const insertGuest = db.prepare("INSERT OR IGNORE INTO guests (display_name, party_id, can_bring_plus_one) VALUES (?, ?, ?)");
    insertGuest.run("Jane Guest", partyId, 1);
    insertGuest.run("John Guest", partyId, 0);
    insertGuest.run("Website Guest", null, 0);

    insertConfig.run(LANDING_TITLE_KEY, "We're Getting Married!");
    insertConfig.run(LANDING_BACKGROUND_KEY, "");
    insertConfig.run(HOME_TITLE_KEY, "Our Wedding");
    insertConfig.run(HOME_DATE_KEY, "2026-08-15");
    insertConfig.run(HOME_TIME_KEY, "15:00");
    insertConfig.run(HOME_VENUE_KEY, "");
    insertConfig.run(HOME_LOCATION_KEY, "Venue Name, City");
    insertConfig.run(HOME_BACKGROUND_VIDEO_KEY, "");
    insertConfig.run(BANNER_TEXT_KEY, "");
    insertConfig.run("dress_code_text", "Please dress in formal attire. Our wedding will feature a black-tie optional dress code. We recommend suits and cocktail dresses.");

    const insertLodging = db.prepare("INSERT INTO lodging_options (title, image_url, url, sort_order) VALUES (?, ?, ?, ?)");
    insertLodging.run("Grand Hotel", "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600", "https://example.com/grand-hotel", 0);
    insertLodging.run("Seaside Resort", "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=600", "https://example.com/seaside", 1);

    const insertDress = db.prepare("INSERT INTO dress_code_images (image_url, sort_order) VALUES (?, ?)");
    insertDress.run("https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?w=400", 0);
    insertDress.run("https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400", 1);

    const insertMedia = db.prepare("INSERT INTO media_items (type, url, thumbnail_url, title, section, sort_order) VALUES (?, ?, ?, ?, ?, ?)");
    insertMedia.run("image", "https://images.unsplash.com/photo-1519741497674-611481863552?w=600", null, "Engagement", "engagement", 0);
    insertMedia.run("image", "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600", null, "Ceremony Venue", "venue", 0);
    insertMedia.run("image", "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=600", null, "Reception Hall", "venue", 1);

    const insertTab = db.prepare("INSERT INTO media_tabs (slug, label, sort_order) VALUES (?, ?, ?)");
    insertTab.run("engagement", "Engagement", 0);
    insertTab.run("venue", "Venue", 1);

    const insertSchedule = db.prepare("INSERT INTO schedule_items (time, label, sort_order) VALUES (?, ?, ?)");
    insertSchedule.run("3:00 PM", "Ceremony", 0);
    insertSchedule.run("4:00 PM", "Cocktail Hour", 1);
    insertSchedule.run("6:00 PM", "Dinner & Reception", 2);
    insertSchedule.run("9:00 PM", "Dancing", 3);
  });
  seed();

  console.log("Database seeded with wedding demo data.");
} else {
  console.log("Database already has demo data. Skipping seed.");
}

db.close();

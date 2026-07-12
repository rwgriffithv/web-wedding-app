import Database from "better-sqlite3";
import path from "path";
import { DDL } from "../src/lib/schema";
import { hashPassword } from "../src/lib/auth";

const dbPath = process.env.DATABASE_URL?.replace(/^file:/, "") || path.join(process.cwd(), "data", "dev.db");

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

const adminUsername = process.env.ADMIN_USERNAME || "admin";
const adminPassword = process.env.ADMIN_PASSWORD || "admin";

db.exec(DDL);

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

    const insertConfig = db.prepare("INSERT OR IGNORE INTO site_config (key, value) VALUES (?, ?)");
    insertConfig.run("landing_title", "We're Getting Married!");
    insertConfig.run("landing_background", "");
    insertConfig.run("home_title", "Our Wedding");
    insertConfig.run("home_subtitle", "Together with our families");
    insertConfig.run("home_date", "August 15, 2026");
    insertConfig.run("home_location", "Venue Name, City");
    insertConfig.run("home_background_video", "");
    insertConfig.run("dress_code_text", "Please dress in formal attire. Our wedding will feature a black-tie optional dress code. We recommend suits and cocktail dresses.");

    const insertLodging = db.prepare("INSERT INTO lodging_options (title, image_url, url, sort_order) VALUES (?, ?, ?, ?)");
    insertLodging.run("Grand Hotel", "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600", "https://example.com/grand-hotel", 0);
    insertLodging.run("Seaside Resort", "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=600", "https://example.com/seaside", 1);

    const insertDress = db.prepare("INSERT INTO dress_code_images (image_url, sort_order) VALUES (?, ?)");
    insertDress.run("https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?w=400", 0);
    insertDress.run("https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400", 1);

    const insertMedia = db.prepare("INSERT INTO media_items (type, url, thumbnail_url, title, section, sort_order) VALUES (?, ?, ?, ?, ?, ?)");
    insertMedia.run("image", "https://images.unsplash.com/photo-1519741497674-611481863552?w=600", null, "Engagement", "Engagement", 0);
    insertMedia.run("image", "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600", null, "Ceremony Venue", "Venue", 0);
    insertMedia.run("image", "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=600", null, "Reception Hall", "Venue", 1);

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

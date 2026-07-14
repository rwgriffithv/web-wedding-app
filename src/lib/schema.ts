export const DDL = `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    display_name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('admin', 'viewer', 'party')),
    party_id INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_login_at TEXT,
    total_page_views INTEGER NOT NULL DEFAULT 0,
    password_changed_at TEXT,
    last_page_view_at TEXT,
    FOREIGN KEY (party_id) REFERENCES parties(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS parties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    invited INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS guests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    display_name TEXT NOT NULL,
    party_id INTEGER,
    can_bring_plus_one INTEGER NOT NULL DEFAULT 0,
    unexpected INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (party_id) REFERENCES parties(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS site_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS lodging_options (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    image_url TEXT NOT NULL,
    thumbnail_url TEXT,
    url TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS dress_code_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    image_url TEXT NOT NULL,
    thumbnail_url TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS rsvp_responses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guest_id INTEGER NOT NULL UNIQUE,
    guest_name TEXT NOT NULL,
    attending INTEGER NOT NULL DEFAULT 0,
    plus_one_name TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (guest_id) REFERENCES guests(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS media_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK(type IN ('image', 'video')),
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    title TEXT,
    section TEXT NOT NULL DEFAULT 'General',
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS media_tabs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS schedule_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    time TEXT NOT NULL,
    label TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE INDEX IF NOT EXISTS idx_guests_party_id ON guests(party_id);
  CREATE INDEX IF NOT EXISTS idx_users_party_id ON users(party_id);
  CREATE INDEX IF NOT EXISTS idx_users_type ON users(type);
  CREATE INDEX IF NOT EXISTS idx_rsvp_attending ON rsvp_responses(attending);
  CREATE INDEX IF NOT EXISTS idx_media_section ON media_items(section);
  CREATE INDEX IF NOT EXISTS idx_media_sort_order ON media_items(sort_order);
  CREATE INDEX IF NOT EXISTS idx_media_tabs_sort_order ON media_tabs(sort_order);
  CREATE INDEX IF NOT EXISTS idx_lodging_sort_order ON lodging_options(sort_order);
  CREATE INDEX IF NOT EXISTS idx_schedule_sort_order ON schedule_items(sort_order);
  CREATE INDEX IF NOT EXISTS idx_dress_code_sort_order ON dress_code_images(sort_order);
  CREATE INDEX IF NOT EXISTS idx_parties_invited ON parties(invited);

  CREATE TABLE IF NOT EXISTS faq_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    party_id INTEGER NOT NULL,
    question TEXT NOT NULL,
    answer TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    answered_at TEXT,
    FOREIGN KEY (party_id) REFERENCES parties(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_faq_sort_order ON faq_items(sort_order);
  CREATE INDEX IF NOT EXISTS idx_questions_party_id ON questions(party_id);

  CREATE TABLE IF NOT EXISTS banned_ips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip_address TEXT NOT NULL,
    reason TEXT NOT NULL DEFAULT 'manual',
    banned_at TEXT NOT NULL DEFAULT (datetime('now')),
    unbanned_at TEXT
  );

  CREATE TABLE IF NOT EXISTS rate_limit_violations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip_address TEXT NOT NULL,
    violated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_banned_ips_ip ON banned_ips(ip_address);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_banned_ips_active ON banned_ips(ip_address) WHERE unbanned_at IS NULL;
  CREATE INDEX IF NOT EXISTS idx_rate_limit_violations_ip ON rate_limit_violations(ip_address);
`;

-- D1 (SQLite) schema for starQ

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS surah_progress (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  surah_number INTEGER NOT NULL,
  stars INTEGER NOT NULL DEFAULT 0 CHECK (stars >= 0 AND stars <= 5),
  first_attempt INTEGER NOT NULL DEFAULT 1 CHECK (first_attempt IN (0, 1)),
  attempts INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (student_id, surah_number),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS custom_items (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  title TEXT NOT NULL,
  stars INTEGER NOT NULL DEFAULT 0 CHECK (stars >= 0 AND stars <= 5),
  first_attempt INTEGER NOT NULL DEFAULT 1 CHECK (first_attempt IN (0, 1)),
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (student_id, title),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- Optional seed data (same as original)
INSERT OR IGNORE INTO students (id, name) VALUES
  ('seed-faaris', 'Faaris'),
  ('seed-isaac', 'Isaac'),
  ('seed-arissa', 'Arissa'),
  ('seed-daniya', 'Daniya'),
  ('seed-amal', 'Amal'),
  ('seed-ayman', 'Ayman'),
  ('seed-enaya', 'Enaya'),
  ('seed-nyla', 'Nyla'),
  ('seed-isa', 'Isa'),
  ('seed-zakariya', 'Zakariya'),
  ('seed-haniyah', 'Haniyah');


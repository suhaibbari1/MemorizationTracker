-- Grade management table (for admin-configurable grades)
CREATE TABLE IF NOT EXISTS grades (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE, -- e.g. "3rd", "4th", "5th"
  label TEXT NOT NULL,       -- e.g. "3rd Grade"
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_grades_sort ON grades(sort_order, label);

-- Seed common grades (safe to run multiple times)
INSERT OR IGNORE INTO grades (id, code, label, sort_order) VALUES
  ('grade-3rd', '3rd', '3rd Grade', 30),
  ('grade-4th', '4th', '4th Grade', 40);


-- Per-grade Surah list (selected + ordered)
CREATE TABLE IF NOT EXISTS grade_surahs (
  id TEXT PRIMARY KEY,
  grade_code TEXT NOT NULL,           -- matches grades.code (e.g. "3rd")
  surah_number INTEGER NOT NULL,      -- 1..114
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (grade_code, surah_number)
);

CREATE INDEX IF NOT EXISTS idx_grade_surahs_grade_sort ON grade_surahs(grade_code, sort_order, surah_number);

-- Seed defaults: 3rd + 4th get "last 21" (114 down to 94)
INSERT OR IGNORE INTO grade_surahs (id, grade_code, surah_number, sort_order) VALUES
  ('gs-3rd-114', '3rd', 114, 10),
  ('gs-3rd-113', '3rd', 113, 20),
  ('gs-3rd-112', '3rd', 112, 30),
  ('gs-3rd-111', '3rd', 111, 40),
  ('gs-3rd-110', '3rd', 110, 50),
  ('gs-3rd-109', '3rd', 109, 60),
  ('gs-3rd-108', '3rd', 108, 70),
  ('gs-3rd-107', '3rd', 107, 80),
  ('gs-3rd-106', '3rd', 106, 90),
  ('gs-3rd-105', '3rd', 105, 100),
  ('gs-3rd-104', '3rd', 104, 110),
  ('gs-3rd-103', '3rd', 103, 120),
  ('gs-3rd-102', '3rd', 102, 130),
  ('gs-3rd-101', '3rd', 101, 140),
  ('gs-3rd-100', '3rd', 100, 150),
  ('gs-3rd-99',  '3rd', 99,  160),
  ('gs-3rd-98',  '3rd', 98,  170),
  ('gs-3rd-97',  '3rd', 97,  180),
  ('gs-3rd-96',  '3rd', 96,  190),
  ('gs-3rd-95',  '3rd', 95,  200),
  ('gs-3rd-94',  '3rd', 94,  210),

  ('gs-4th-114', '4th', 114, 10),
  ('gs-4th-113', '4th', 113, 20),
  ('gs-4th-112', '4th', 112, 30),
  ('gs-4th-111', '4th', 111, 40),
  ('gs-4th-110', '4th', 110, 50),
  ('gs-4th-109', '4th', 109, 60),
  ('gs-4th-108', '4th', 108, 70),
  ('gs-4th-107', '4th', 107, 80),
  ('gs-4th-106', '4th', 106, 90),
  ('gs-4th-105', '4th', 105, 100),
  ('gs-4th-104', '4th', 104, 110),
  ('gs-4th-103', '4th', 103, 120),
  ('gs-4th-102', '4th', 102, 130),
  ('gs-4th-101', '4th', 101, 140),
  ('gs-4th-100', '4th', 100, 150),
  ('gs-4th-99',  '4th', 99,  160),
  ('gs-4th-98',  '4th', 98,  170),
  ('gs-4th-97',  '4th', 97,  180),
  ('gs-4th-96',  '4th', 96,  190),
  ('gs-4th-95',  '4th', 95,  200),
  ('gs-4th-94',  '4th', 94,  210);


-- Archive support for grades
ALTER TABLE grades ADD COLUMN is_archived INTEGER NOT NULL DEFAULT 0 CHECK (is_archived IN (0, 1));
ALTER TABLE grades ADD COLUMN archived_at TEXT;

CREATE INDEX IF NOT EXISTS idx_grades_archived ON grades(is_archived, sort_order, label);


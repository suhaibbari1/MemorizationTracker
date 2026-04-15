-- Add grade-level separation to students
ALTER TABLE students ADD COLUMN grade TEXT NOT NULL DEFAULT '4th';

CREATE INDEX IF NOT EXISTS idx_students_grade ON students(grade);


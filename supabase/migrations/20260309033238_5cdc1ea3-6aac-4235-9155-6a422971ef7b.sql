
-- Create students table
CREATE TABLE public.students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create surah_progress table
CREATE TABLE public.surah_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  surah_number INTEGER NOT NULL,
  stars INTEGER NOT NULL DEFAULT 0 CHECK (stars >= 0 AND stars <= 5),
  first_attempt BOOLEAN NOT NULL DEFAULT true,
  attempts INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (student_id, surah_number)
);

-- Enable RLS
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surah_progress ENABLE ROW LEVEL SECURITY;

-- Allow public read/write (no auth needed for this school tracker)
CREATE POLICY "Anyone can read students" ON public.students FOR SELECT USING (true);
CREATE POLICY "Anyone can insert students" ON public.students FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update students" ON public.students FOR UPDATE USING (true);

CREATE POLICY "Anyone can read progress" ON public.surah_progress FOR SELECT USING (true);
CREATE POLICY "Anyone can insert progress" ON public.surah_progress FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update progress" ON public.surah_progress FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete progress" ON public.surah_progress FOR DELETE USING (true);

-- Seed the students
INSERT INTO public.students (name) VALUES
  ('Faaris'), ('Isaac'), ('Arissa'), ('Daniya'), ('Amal'),
  ('Ayman'), ('Enaya'), ('Nyla'), ('Isa'), ('Zakariya'), ('Haniyah');

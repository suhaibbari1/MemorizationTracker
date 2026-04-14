-- Custom memorization items (e.g., Dua e Qunoot) per student
CREATE TABLE public.custom_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  stars INTEGER NOT NULL DEFAULT 0 CHECK (stars >= 0 AND stars <= 5),
  first_attempt BOOLEAN NOT NULL DEFAULT true,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (student_id, title)
);

ALTER TABLE public.custom_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read custom items" ON public.custom_items FOR SELECT USING (true);
CREATE POLICY "Anyone can insert custom items" ON public.custom_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update custom items" ON public.custom_items FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete custom items" ON public.custom_items FOR DELETE USING (true);


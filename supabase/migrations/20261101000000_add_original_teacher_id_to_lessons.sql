-- Migration: 20261101000000_add_original_teacher_id_to_lessons.sql
-- Description: Add original_teacher_id to lessons table for teacher substitution (Vertretung)

ALTER TABLE public.lessons
ADD COLUMN IF NOT EXISTS original_teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_lessons_original_teacher_id ON public.lessons(original_teacher_id);

COMMENT ON COLUMN public.lessons.original_teacher_id IS 'ID der ursprünglichen Lehrkraft bei einer Vertretung';

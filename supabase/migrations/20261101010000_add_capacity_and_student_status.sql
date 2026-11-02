-- Task 1: Add max_capacity to courses and status to student_courses
-- 1. Add max_capacity to courses (default 10)
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS max_capacity INTEGER NOT NULL DEFAULT 10;

-- 2. Add status to student_courses (default 'active', values 'active', 'trial', 'waiting')
ALTER TABLE public.student_courses
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

-- Drop constraint if exists, then add constraint
ALTER TABLE public.student_courses
DROP CONSTRAINT IF EXISTS student_courses_status_check;

ALTER TABLE public.student_courses
ADD CONSTRAINT student_courses_status_check
CHECK (status IN ('active', 'trial', 'waiting'));

-- Create index on status for faster filtering
CREATE INDEX IF NOT EXISTS idx_student_courses_status ON public.student_courses(status);

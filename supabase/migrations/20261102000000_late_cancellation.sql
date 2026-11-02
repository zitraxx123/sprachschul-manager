-- Migration: Late Cancellation rules for organizations and lessons status
-- 1. Add late_cancellation_hours to organizations (default: 24 hours)
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS late_cancellation_hours INTEGER NOT NULL DEFAULT 24;

-- 2. Add late_cancellation_pay_percent to organizations (default: 50 percent)
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS late_cancellation_pay_percent INTEGER NOT NULL DEFAULT 50;

-- 3. Add status column to lessons (default: 'completed')
ALTER TABLE public.lessons
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'completed';

-- 4. Add check constraint for lessons status
ALTER TABLE public.lessons
DROP CONSTRAINT IF EXISTS lessons_status_check;

ALTER TABLE public.lessons
ADD CONSTRAINT lessons_status_check
CHECK (status IN ('completed', 'cancelled_by_student', 'cancelled_late'));

-- 5. Add index on lessons status for fast filtering
CREATE INDEX IF NOT EXISTS idx_lessons_status ON public.lessons(status);

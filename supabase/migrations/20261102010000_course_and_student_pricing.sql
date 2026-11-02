-- Migration: Add monthly_price to courses and custom_monthly_price to students
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS monthly_price NUMERIC(10, 2) NOT NULL DEFAULT 0;

ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS custom_monthly_price NUMERIC(10, 2) NULL;

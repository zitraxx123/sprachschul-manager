-- Migration: Add parent contact fields to students and course_type to courses

-- 1. Add parent contact fields to students table
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS parent_name TEXT,
ADD COLUMN IF NOT EXISTS parent_phone TEXT,
ADD COLUMN IF NOT EXISTS parent_email TEXT;

-- 2. Add course_type column to courses table (default 'group', options: 'group', 'individual')
ALTER TABLE courses
ADD COLUMN IF NOT EXISTS course_type TEXT NOT NULL DEFAULT 'group'
CHECK (course_type IN ('group', 'individual'));

-- 3. Ensure existing courses have 'group' default
UPDATE courses SET course_type = 'group' WHERE course_type IS NULL;

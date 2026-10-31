-- Migration: 20261031000004_decimal_student_hours.sql
-- Description: Allow decimal/fractional hours for student packages (e.g. 1.5, 8.5)

alter table public.students 
    alter column total_lessons_paid type numeric(7,2),
    alter column remaining_lessons type numeric(7,2);

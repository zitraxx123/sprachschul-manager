-- ============================================================
-- SQL-МИГРАЦИЯ: ИНДЕКСЫ ДЛЯ СУПЕР-УСКОРЕНИЯ БАЗЫ ДАННЫХ
-- ============================================================

-- 1. organization_members
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user_org ON organization_members(user_id, organization_id);

-- 2. teachers
CREATE INDEX IF NOT EXISTS idx_teachers_org_id ON teachers(organization_id);
CREATE INDEX IF NOT EXISTS idx_teachers_user_id ON teachers(user_id);

-- 3. students (ученики привязаны к организации, а курсы находятся в student_courses)
CREATE INDEX IF NOT EXISTS idx_students_org_id ON students(organization_id);

-- 4. courses
CREATE INDEX IF NOT EXISTS idx_courses_org_id ON courses(organization_id);
CREATE INDEX IF NOT EXISTS idx_courses_teacher_id ON courses(teacher_id);
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rooms') THEN
    ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS room_id uuid REFERENCES public.rooms(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_courses_room_id ON courses(room_id);
  END IF;
END $$;

-- 5. course_schedules (расписание по дням и курсам)
CREATE INDEX IF NOT EXISTS idx_course_schedules_course_id ON course_schedules(course_id);
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'course_schedules' AND column_name = 'organization_id') THEN
    CREATE INDEX IF NOT EXISTS idx_course_schedules_org_id ON course_schedules(organization_id);
  END IF;
END $$;

-- 6. student_courses (связь учеников и курсов)
CREATE INDEX IF NOT EXISTS idx_student_courses_student_id ON student_courses(student_id);
CREATE INDEX IF NOT EXISTS idx_student_courses_course_id ON student_courses(course_id);
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'student_courses' AND column_name = 'organization_id') THEN
    CREATE INDEX IF NOT EXISTS idx_student_courses_org_id ON student_courses(organization_id);
  END IF;
END $$;

-- 7. lessons (уроки и привязка к курсам)
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_lessons_org_id ON lessons(organization_id);
CREATE INDEX IF NOT EXISTS idx_lessons_teacher_id ON lessons(teacher_id);
CREATE INDEX IF NOT EXISTS idx_lessons_student_id ON lessons(student_id);
CREATE INDEX IF NOT EXISTS idx_lessons_course_id ON lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_org_date ON lessons(organization_id, lesson_date DESC);

-- 8. monthly_payments
CREATE INDEX IF NOT EXISTS idx_monthly_payments_org_id ON monthly_payments(organization_id);
CREATE INDEX IF NOT EXISTS idx_monthly_payments_student_id ON monthly_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_monthly_payments_lookup ON monthly_payments(organization_id, month_year, student_id);

-- 9. attendance
CREATE INDEX IF NOT EXISTS idx_attendance_org_id ON attendance(organization_id);
CREATE INDEX IF NOT EXISTS idx_attendance_lesson_id ON attendance(lesson_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance(lesson_id, status);

-- 10. rooms
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rooms') THEN
    CREATE INDEX IF NOT EXISTS idx_rooms_org_id ON rooms(organization_id);
  END IF;
END $$;

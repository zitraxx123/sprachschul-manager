-- Migration: 20261103020000_restrict_student_access_for_teachers.sql
-- Description: Teachers may only read students / enrollments of courses they teach
--              (courses.teacher_id = current teacher) or substitute for (lesson_overrides.new_teacher_id).
--              Owners/admins keep full access.
-- Requires: 20261103000000_lesson_overrides.sql (and 20261103010000 if already applied - it is superseded here).
-- Idempotent: safe to run more than once.

-- ---------------------------------------------------------------------------
-- 1. Helper functions (SECURITY DEFINER: no RLS recursion, cheap checks)
-- ---------------------------------------------------------------------------

-- Current teacher teaches the course, or is (recently) assigned as substitute for one of its lessons
create or replace function public.can_access_course_roster(p_course_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
    select
        exists (
            select 1
            from public.courses c
            where c.id = p_course_id
              and c.teacher_id = public.get_current_teacher_id()
        )
        or exists (
            select 1
            from public.lesson_overrides lo
            where lo.course_id = p_course_id
              and lo.new_teacher_id = public.get_current_teacher_id()
              and lo.lesson_date >= current_date - 30
        );
$$;

alter function public.can_access_course_roster(uuid) owner to postgres;

-- Current teacher may see the student: enrolled in an accessible course,
-- or taught by this teacher in an individual lesson (lessons.student_id)
create or replace function public.can_access_student(p_student_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
    select
        exists (
            select 1
            from public.student_courses sc
            where sc.student_id = p_student_id
              and public.can_access_course_roster(sc.course_id)
        )
        or exists (
            select 1
            from public.lessons l
            where l.student_id = p_student_id
              and l.teacher_id = public.get_current_teacher_id()
        );
$$;

alter function public.can_access_student(uuid) owner to postgres;

-- ---------------------------------------------------------------------------
-- 2. student_courses: SELECT
-- ---------------------------------------------------------------------------
drop policy if exists "Student courses select policy" on public.student_courses;
drop policy if exists "Student courses substitute select policy" on public.student_courses;

create policy "Student courses select policy"
    on public.student_courses
    for select
    using (
        public.is_org_admin(organization_id)
        or (
            organization_id in (select public.get_user_org_ids())
            and public.can_access_course_roster(course_id)
        )
    );

-- ---------------------------------------------------------------------------
-- 3. students: SELECT
-- ---------------------------------------------------------------------------
drop policy if exists "Students select policy" on public.students;
drop policy if exists "Students substitute select policy" on public.students;

create policy "Students select policy"
    on public.students
    for select
    using (
        public.is_org_admin(organization_id)
        or (
            organization_id in (select public.get_user_org_ids())
            and public.can_access_student(id)
        )
    );

-- Superseded by can_access_student()
drop function if exists public.is_student_in_substituted_course(uuid);

-- NOTE: INSERT/UPDATE/DELETE policies on both tables are intentionally unchanged.
-- If the live database has additional permissive SELECT policies on these tables
-- (drift from the repo migrations), they stay OR-combined and must be dropped manually.

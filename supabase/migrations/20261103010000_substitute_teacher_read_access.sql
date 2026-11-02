-- Migration: 20261103010000_substitute_teacher_read_access.sql
-- Description: A teacher assigned as substitute (Vertretung) via lesson_overrides must be able to
--              read the course schedule and the participants of that course.
--
-- Notes
--  * Policies below are ADDITIVE (permissive policies are OR-combined) - they never remove existing access.
--  * In the repo migrations, students / student_courses are already readable by every school member.
--    The substitute policies are a safety net: they keep the substitute flow working even if those
--    policies are tightened later (or if the live database has drifted from the migrations).
--  * course_schedules has NO policies in the repo migrations (table was created outside of them).
--    This migration defines its full policy set, mirroring "courses": members read, admins write.
--  * Idempotent: safe to run more than once.

-- ---------------------------------------------------------------------------
-- 1. Helper functions (SECURITY DEFINER avoids RLS recursion and keeps checks cheap)
-- ---------------------------------------------------------------------------

-- True if the current teacher is (or recently was) assigned as substitute for any lesson of this course
create or replace function public.is_substitute_for_course(p_course_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
    select exists (
        select 1
        from public.lesson_overrides lo
        where lo.course_id = p_course_id
          and lo.new_teacher_id = public.get_current_teacher_id()
          and lo.lesson_date >= current_date - 30
    );
$$;

alter function public.is_substitute_for_course(uuid) owner to postgres;

-- True if the student is enrolled in a course the current teacher substitutes for
create or replace function public.is_student_in_substituted_course(p_student_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
    select exists (
        select 1
        from public.student_courses sc
        join public.lesson_overrides lo on lo.course_id = sc.course_id
        where sc.student_id = p_student_id
          and lo.new_teacher_id = public.get_current_teacher_id()
          and lo.lesson_date >= current_date - 30
    );
$$;

alter function public.is_student_in_substituted_course(uuid) owner to postgres;

-- ---------------------------------------------------------------------------
-- 2. course_schedules: members read, admins write (+ substitute read)
-- ---------------------------------------------------------------------------
alter table public.course_schedules enable row level security;

drop policy if exists "Course schedules select policy" on public.course_schedules;
drop policy if exists "Course schedules insert policy" on public.course_schedules;
drop policy if exists "Course schedules update policy" on public.course_schedules;
drop policy if exists "Course schedules delete policy" on public.course_schedules;
drop policy if exists "Course schedules substitute select policy" on public.course_schedules;

-- organization_id on course_schedules is nullable -> resolve the school through the course
create policy "Course schedules select policy"
    on public.course_schedules
    for select
    using (
        exists (
            select 1 from public.courses c
            where c.id = course_schedules.course_id
              and c.organization_id in (select public.get_user_org_ids())
        )
    );

create policy "Course schedules substitute select policy"
    on public.course_schedules
    for select
    using (public.is_substitute_for_course(course_id));

create policy "Course schedules insert policy"
    on public.course_schedules
    for insert
    to authenticated
    with check (
        exists (
            select 1 from public.courses c
            where c.id = course_schedules.course_id
              and public.is_org_admin(c.organization_id)
        )
    );

create policy "Course schedules update policy"
    on public.course_schedules
    for update
    using (
        exists (
            select 1 from public.courses c
            where c.id = course_schedules.course_id
              and public.is_org_admin(c.organization_id)
        )
    );

create policy "Course schedules delete policy"
    on public.course_schedules
    for delete
    using (
        exists (
            select 1 from public.courses c
            where c.id = course_schedules.course_id
              and public.is_org_admin(c.organization_id)
        )
    );

-- ---------------------------------------------------------------------------
-- 3. student_courses: substitute may read enrollments of the substituted course
-- ---------------------------------------------------------------------------
drop policy if exists "Student courses substitute select policy" on public.student_courses;

create policy "Student courses substitute select policy"
    on public.student_courses
    for select
    using (public.is_substitute_for_course(course_id));

-- ---------------------------------------------------------------------------
-- 4. students: substitute may read participants of the substituted course
-- ---------------------------------------------------------------------------
drop policy if exists "Students substitute select policy" on public.students;

create policy "Students substitute select policy"
    on public.students
    for select
    using (public.is_student_in_substituted_course(id));

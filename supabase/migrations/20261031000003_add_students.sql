-- Migration: 20261031000003_add_students.sql
-- Description: Add students table, student_id to lessons, and RLS policies

-- 1. Create students table
create table if not exists public.students (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    first_name text not null,
    last_name text not null,
    email text,
    phone text,
    course_name text,
    total_lessons_paid integer not null default 10 check (total_lessons_paid >= 0),
    remaining_lessons integer not null default 10,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

comment on table public.students is 'Students / course participants (Schüler)';

create index if not exists idx_students_org_id on public.students(organization_id);

-- 2. Add student_id to lessons table
alter table public.lessons
add column if not exists student_id uuid references public.students(id) on delete set null;

create index if not exists idx_lessons_student_id on public.lessons(student_id);

-- 3. Enable RLS on students table
alter table public.students enable row level security;

-- 4. RLS Policies for students
drop policy if exists "Students select policy" on public.students;
drop policy if exists "Students insert policy" on public.students;
drop policy if exists "Students update policy" on public.students;
drop policy if exists "Students delete policy" on public.students;

-- 4.1 SELECT: All school members (Admins and Teachers) can view students in their school
create policy "Students select policy"
    on public.students
    for select
    using (
        organization_id in (select public.get_user_org_ids())
    );

-- 4.2 INSERT: Only school owners and admins can create students
create policy "Students insert policy"
    on public.students
    for insert
    to authenticated
    with check (
        public.is_org_admin(organization_id)
    );

-- 4.3 UPDATE: School members can update students (e.g. adjust lesson balance)
create policy "Students update policy"
    on public.students
    for update
    using (
        organization_id in (select public.get_user_org_ids())
    );

-- 4.4 DELETE: Only school owners and admins can delete students
create policy "Students delete policy"
    on public.students
    for delete
    using (
        public.is_org_admin(organization_id)
    );

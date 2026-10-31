-- Migration: 20261031000006_student_courses_many_to_many.sql
-- Description: Implement many-to-many relationship between students and courses via student_courses

-- 1. Create junction table student_courses
create table if not exists public.student_courses (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    student_id uuid not null references public.students(id) on delete cascade,
    course_id uuid not null references public.courses(id) on delete cascade,
    created_at timestamptz not null default now(),
    unique(student_id, course_id)
);

comment on table public.student_courses is 'Many-to-many relation linking students to multiple courses/groups';

create index if not exists idx_student_courses_org_id on public.student_courses(organization_id);
create index if not exists idx_student_courses_student_id on public.student_courses(student_id);
create index if not exists idx_student_courses_course_id on public.student_courses(course_id);

-- 2. Migrate existing course assignments from students.course_id into student_courses
do $$
begin
    if exists (
        select 1 
        from information_schema.columns 
        where table_schema = 'public' 
          and table_name = 'students' 
          and column_name = 'course_id'
    ) then
        insert into public.student_courses (organization_id, student_id, course_id)
        select organization_id, id as student_id, course_id
        from public.students
        where course_id is not null
        on conflict (student_id, course_id) do nothing;

        -- Drop the single foreign key column from students
        alter table public.students drop column course_id;
    end if;
end $$;

-- 3. Enable Row Level Security (RLS) on student_courses
alter table public.student_courses enable row level security;

-- 4. RLS Policies for student_courses
drop policy if exists "Student courses select policy" on public.student_courses;
drop policy if exists "Student courses insert policy" on public.student_courses;
drop policy if exists "Student courses update policy" on public.student_courses;
drop policy if exists "Student courses delete policy" on public.student_courses;

-- 4.1 SELECT: Visible to all school members (admins and teachers)
create policy "Student courses select policy"
    on public.student_courses
    for select
    using (organization_id in (select public.get_user_org_ids()));

-- 4.2 INSERT: School admins (or members) can link students to courses
create policy "Student courses insert policy"
    on public.student_courses
    for insert
    to authenticated
    with check (organization_id in (select public.get_user_org_ids()));

-- 4.3 UPDATE: School members can update links
create policy "Student courses update policy"
    on public.student_courses
    for update
    using (organization_id in (select public.get_user_org_ids()));

-- 4.4 DELETE: School members can remove links
create policy "Student courses delete policy"
    on public.student_courses
    for delete
    using (organization_id in (select public.get_user_org_ids()));

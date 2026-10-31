-- Migration: 20261031000005_monatsabo_and_courses.sql
-- Description: Transition from hourly packages to monthly subscriptions (Monatsabo), courses, attendance and monthly payments

-- 1. Create courses table
create table if not exists public.courses (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    name text not null,
    teacher_id uuid references public.teachers(id) on delete set null,
    day_of_week text not null, -- 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'
    time text not null default '18:00',
    duration numeric(4,2) not null default 1.5 check (duration > 0),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

comment on table public.courses is 'Courses / class groups (Kurse)';
create index if not exists idx_courses_org_id on public.courses(organization_id);
create index if not exists idx_courses_teacher_id on public.courses(teacher_id);

-- 2. Update students table: Add course_id and remove hourly package columns
alter table public.students
add column if not exists course_id uuid references public.courses(id) on delete set null;

create index if not exists idx_students_course_id on public.students(course_id);

alter table public.students
drop column if exists total_lessons_paid,
drop column if exists remaining_lessons;

-- 3. Create monthly_payments table (Monatsabo: fixed monthly fee per student)
create table if not exists public.monthly_payments (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    student_id uuid not null references public.students(id) on delete cascade,
    month_year text not null, -- Format: 'YYYY-MM', e.g. '2026-10'
    amount_euro numeric(10,2) not null default 0 check (amount_euro >= 0),
    is_paid boolean not null default true,
    created_at timestamptz not null default now(),
    unique(student_id, month_year)
);

comment on table public.monthly_payments is 'Monthly student subscription payments (Monatsbeiträge)';
create index if not exists idx_monthly_payments_org_id on public.monthly_payments(organization_id);
create index if not exists idx_monthly_payments_student_id on public.monthly_payments(student_id);
create index if not exists idx_monthly_payments_month on public.monthly_payments(month_year);

-- 4. Add course_id to lessons table
alter table public.lessons
add column if not exists course_id uuid references public.courses(id) on delete set null;

create index if not exists idx_lessons_course_id on public.lessons(course_id);

-- 5. Create attendance table (attendance tracking per lesson & student)
create table if not exists public.attendance (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    lesson_id uuid not null references public.lessons(id) on delete cascade,
    student_id uuid not null references public.students(id) on delete cascade,
    status text not null check (status in ('present', 'absent')),
    created_at timestamptz not null default now(),
    unique(lesson_id, student_id)
);

comment on table public.attendance is 'Student attendance per lesson (Anwesenheit: present / absent)';
create index if not exists idx_attendance_lesson_id on public.attendance(lesson_id);
create index if not exists idx_attendance_student_id on public.attendance(student_id);
create index if not exists idx_attendance_org_id on public.attendance(organization_id);

-- 6. Enable Row Level Security
alter table public.courses enable row level security;
alter table public.monthly_payments enable row level security;
alter table public.attendance enable row level security;

-- 7. RLS Policies: courses
drop policy if exists "Courses select policy" on public.courses;
drop policy if exists "Courses insert policy" on public.courses;
drop policy if exists "Courses update policy" on public.courses;
drop policy if exists "Courses delete policy" on public.courses;

create policy "Courses select policy"
    on public.courses
    for select
    using (organization_id in (select public.get_user_org_ids()));

create policy "Courses insert policy"
    on public.courses
    for insert
    to authenticated
    with check (public.is_org_admin(organization_id));

create policy "Courses update policy"
    on public.courses
    for update
    using (public.is_org_admin(organization_id));

create policy "Courses delete policy"
    on public.courses
    for delete
    using (public.is_org_admin(organization_id));

-- 8. RLS Policies: monthly_payments
drop policy if exists "Monthly payments select policy" on public.monthly_payments;
drop policy if exists "Monthly payments insert policy" on public.monthly_payments;
drop policy if exists "Monthly payments update policy" on public.monthly_payments;
drop policy if exists "Monthly payments delete policy" on public.monthly_payments;

create policy "Monthly payments select policy"
    on public.monthly_payments
    for select
    using (organization_id in (select public.get_user_org_ids()));

create policy "Monthly payments insert policy"
    on public.monthly_payments
    for insert
    to authenticated
    with check (public.is_org_admin(organization_id));

create policy "Monthly payments update policy"
    on public.monthly_payments
    for update
    using (public.is_org_admin(organization_id));

create policy "Monthly payments delete policy"
    on public.monthly_payments
    for delete
    using (public.is_org_admin(organization_id));

-- 9. RLS Policies: attendance
drop policy if exists "Attendance select policy" on public.attendance;
drop policy if exists "Attendance insert policy" on public.attendance;
drop policy if exists "Attendance update policy" on public.attendance;
drop policy if exists "Attendance delete policy" on public.attendance;

create policy "Attendance select policy"
    on public.attendance
    for select
    using (organization_id in (select public.get_user_org_ids()));

-- Both Teachers and Admins can record attendance
create policy "Attendance insert policy"
    on public.attendance
    for insert
    to authenticated
    with check (organization_id in (select public.get_user_org_ids()));

create policy "Attendance update policy"
    on public.attendance
    for update
    using (organization_id in (select public.get_user_org_ids()));

create policy "Attendance delete policy"
    on public.attendance
    for delete
    using (public.is_org_admin(organization_id));

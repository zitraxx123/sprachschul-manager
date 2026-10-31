-- Migration: 20261031000000_init_schema.sql
-- Description: Multi-tenant schema for Language Schools (Sprachschulen) SaaS in Germany

-- 1. Enable pgcrypto for UUID generation if not already enabled
create extension if not exists "pgcrypto";

-- 2. Organizations Table (Tenants)
create table if not exists public.organizations (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

comment on table public.organizations is 'Language school tenants/organizations';

-- 3. Organization Memberships Table
create table if not exists public.organization_members (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    role text not null default 'owner' check (role in ('owner', 'admin', 'teacher')),
    created_at timestamptz not null default now(),
    unique(organization_id, user_id)
);

comment on table public.organization_members is 'Mapping between auth.users and organizations with role';

-- Index for fast tenant membership lookups
create index if not exists idx_org_members_user_id on public.organization_members(user_id);
create index if not exists idx_org_members_org_id on public.organization_members(organization_id);

-- 4. Teachers Table (Lehrkräfte)
create table if not exists public.teachers (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    name text not null,
    email text,
    hourly_rate numeric(10, 2) not null default 25.00 check (hourly_rate >= 0),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

comment on table public.teachers is 'Teachers (Lehrer) associated with a language school';

create index if not exists idx_teachers_org_id on public.teachers(organization_id);

-- 5. Lessons Table (Unterrichtsstunden)
create table if not exists public.lessons (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    teacher_id uuid not null references public.teachers(id) on delete cascade,
    student_name text,
    lesson_date date not null default current_date,
    duration_hours numeric(5, 2) not null check (duration_hours > 0),
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

comment on table public.lessons is 'Completed/scheduled lessons (Unterrichtsstunden)';

create index if not exists idx_lessons_org_id on public.lessons(organization_id);
create index if not exists idx_lessons_teacher_id on public.lessons(teacher_id);
create index if not exists idx_lessons_date on public.lessons(lesson_date);

-- 6. Helper Functions for RLS (SECURITY DEFINER + owned by postgres bypasses RLS recursion)
create or replace function public.get_user_org_ids()
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
    select organization_id from public.organization_members where user_id = auth.uid();
$$;

alter function public.get_user_org_ids() owner to postgres;

create or replace function public.is_org_admin(org_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
    select exists (
        select 1
        from public.organization_members
        where organization_id = org_id
          and user_id = auth.uid()
          and role in ('owner', 'admin')
    );
$$;

alter function public.is_org_admin(uuid) owner to postgres;

-- 7. Automatically create Organization & Membership on User Signup (Auth trigger)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    new_org_id uuid;
    org_name text;
begin
    -- Extract organization name from user metadata or use default
    org_name := coalesce(nullif(trim(new.raw_user_meta_data->>'organization_name'), ''), 'Meine Sprachschule');
    
    -- Create the tenant organization
    insert into public.organizations (name)
    values (org_name)
    returning id into new_org_id;

    -- Make the registering user the owner
    insert into public.organization_members (organization_id, user_id, role)
    values (new_org_id, new.id, 'owner');

    return new;
exception
    when others then
        -- Fail-safe so auth user is still created if trigger encounters an edge case
        return new;
end;
$$;

-- Drop trigger if exists and recreate
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- 8. Enable Row Level Security (RLS) on all tables
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.teachers enable row level security;
alter table public.lessons enable row level security;

-- 9. RLS Policies

-- 9.1 Organizations
create policy "Users can view organizations they belong to"
    on public.organizations
    for select
    using (id in (select public.get_user_org_ids()));

create policy "Authenticated users can create organizations"
    on public.organizations
    for insert
    to authenticated
    with check (true);

create policy "Owners and admins can update their organization"
    on public.organizations
    for update
    using (public.is_org_admin(id));

-- 9.2 Organization Members (Non-recursive)
create policy "Members select policy"
    on public.organization_members
    for select
    using (
        user_id = auth.uid()
        or organization_id in (select public.get_user_org_ids())
    );

create policy "Members insert policy"
    on public.organization_members
    for insert
    to authenticated
    with check (
        user_id = auth.uid()
        or public.is_org_admin(organization_id)
    );

create policy "Members update policy"
    on public.organization_members
    for update
    using (public.is_org_admin(organization_id));

create policy "Members delete policy"
    on public.organization_members
    for delete
    using (
        user_id = auth.uid()
        or public.is_org_admin(organization_id)
    );

-- 9.3 Teachers
create policy "Users can view teachers in their organization"
    on public.teachers
    for select
    using (organization_id in (select public.get_user_org_ids()));

create policy "Users can insert teachers in their organization"
    on public.teachers
    for insert
    to authenticated
    with check (organization_id in (select public.get_user_org_ids()));

create policy "Users can update teachers in their organization"
    on public.teachers
    for update
    using (organization_id in (select public.get_user_org_ids()));

create policy "Users can delete teachers in their organization"
    on public.teachers
    for delete
    using (organization_id in (select public.get_user_org_ids()));

-- 9.4 Lessons
create policy "Users can view lessons in their organization"
    on public.lessons
    for select
    using (organization_id in (select public.get_user_org_ids()));

create policy "Users can insert lessons in their organization"
    on public.lessons
    for insert
    to authenticated
    with check (organization_id in (select public.get_user_org_ids()));

create policy "Users can update lessons in their organization"
    on public.lessons
    for update
    using (organization_id in (select public.get_user_org_ids()));

create policy "Users can delete lessons in their organization"
    on public.lessons
    for delete
    using (organization_id in (select public.get_user_org_ids()));

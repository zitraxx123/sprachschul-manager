-- Migration: 20261031000002_teacher_portal_and_rls.sql
-- Description: Add user_id to teachers, role-based RLS isolation, and automatic teacher account linking

-- 1. Add user_id column to teachers table
alter table public.teachers 
add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists idx_teachers_user_id on public.teachers(user_id);

-- 2. Helper Function: Get current authenticated teacher ID (SECURITY DEFINER)
create or replace function public.get_current_teacher_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
    select id from public.teachers where user_id = auth.uid() limit 1;
$$;

alter function public.get_current_teacher_id() owner to postgres;

-- 3. Automatic Account Linking Trigger for Teachers
-- 3.1 When a Teacher is created/updated by Admin with an email:
-- If an auth.user already exists with that email, link user_id and add to organization_members
create or replace function public.handle_teacher_email_linking()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    existing_user_id uuid;
begin
    if new.email is not null and new.user_id is null then
        select id into existing_user_id from auth.users where lower(email) = lower(trim(new.email)) limit 1;
        if existing_user_id is not null then
            new.user_id := existing_user_id;
            insert into public.organization_members (organization_id, user_id, role)
            values (new.organization_id, existing_user_id, 'teacher')
            on conflict (organization_id, user_id) do nothing;
        end if;
    end if;
    return new;
end;
$$;

drop trigger if exists on_teacher_link_email on public.teachers;
create trigger on_teacher_link_email
    before insert or update on public.teachers
    for each row execute function public.handle_teacher_email_linking();

-- 3.2 When a new user signs up in auth.users:
-- If their email matches any pending teacher record, link them to the school as 'teacher'
-- and do NOT create a redundant new organization!
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    new_org_id uuid;
    org_name text;
    teacher_record record;
    has_teacher_invite boolean := false;
begin
    -- Check if this user was already invited as a teacher
    for teacher_record in 
        select id, organization_id from public.teachers 
        where lower(email) = lower(trim(new.email))
    loop
        has_teacher_invite := true;
        -- Link teacher profile to this user
        update public.teachers set user_id = new.id where id = teacher_record.id;
        -- Add membership as 'teacher'
        insert into public.organization_members (organization_id, user_id, role)
        values (teacher_record.organization_id, new.id, 'teacher')
        on conflict (organization_id, user_id) do nothing;
    end loop;

    -- Only create a new organization if the user is a school owner/admin (not an invited teacher)
    if not has_teacher_invite then
        org_name := coalesce(nullif(trim(new.raw_user_meta_data->>'organization_name'), ''), 'Meine Sprachschule');
        
        insert into public.organizations (name)
        values (org_name)
        returning id into new_org_id;

        insert into public.organization_members (organization_id, user_id, role)
        values (new_org_id, new.id, 'owner')
        on conflict (organization_id, user_id) do nothing;
    end if;

    return new;
exception
    when others then
        return new;
end;
$$;

-- 4. Update RLS Policies on Teachers
-- Drop existing teacher policies
drop policy if exists "Users can view teachers in their organization" on public.teachers;
drop policy if exists "Users can insert teachers in their organization" on public.teachers;
drop policy if exists "Users can update teachers in their organization" on public.teachers;
drop policy if exists "Users can delete teachers in their organization" on public.teachers;
drop policy if exists "Teachers select policy" on public.teachers;
drop policy if exists "Teachers insert policy" on public.teachers;
drop policy if exists "Teachers update policy" on public.teachers;
drop policy if exists "Teachers delete policy" on public.teachers;

-- 4.1 Teachers SELECT: Admins/Owners see all teachers; Teachers see ONLY their own row
create policy "Teachers select policy"
    on public.teachers
    for select
    using (
        public.is_org_admin(organization_id)
        or user_id = auth.uid()
    );

-- 4.2 Teachers INSERT: Only Admins/Owners can add teachers
create policy "Teachers insert policy"
    on public.teachers
    for insert
    to authenticated
    with check (
        public.is_org_admin(organization_id)
    );

-- 4.3 Teachers UPDATE: Only Admins/Owners can update teacher rates/info
create policy "Teachers update policy"
    on public.teachers
    for update
    using (
        public.is_org_admin(organization_id)
    );

-- 4.4 Teachers DELETE: Only Admins/Owners can delete teachers
create policy "Teachers delete policy"
    on public.teachers
    for delete
    using (
        public.is_org_admin(organization_id)
    );

-- 5. Update RLS Policies on Lessons
-- Drop existing lesson policies
drop policy if exists "Users can view lessons in their organization" on public.lessons;
drop policy if exists "Users can insert lessons in their organization" on public.lessons;
drop policy if exists "Users can update lessons in their organization" on public.lessons;
drop policy if exists "Users can delete lessons in their organization" on public.lessons;
drop policy if exists "Lessons select policy" on public.lessons;
drop policy if exists "Lessons insert policy" on public.lessons;
drop policy if exists "Lessons update policy" on public.lessons;
drop policy if exists "Lessons delete policy" on public.lessons;

-- 5.1 Lessons SELECT: Admins see all lessons; Teachers see ONLY their own lessons
create policy "Lessons select policy"
    on public.lessons
    for select
    using (
        public.is_org_admin(organization_id)
        or teacher_id = public.get_current_teacher_id()
    );

-- 5.2 Lessons INSERT: Admins can insert any lesson; Teachers can insert lessons for themselves
create policy "Lessons insert policy"
    on public.lessons
    for insert
    to authenticated
    with check (
        public.is_org_admin(organization_id)
        or (
            organization_id in (select public.get_user_org_ids())
            and teacher_id = public.get_current_teacher_id()
        )
    );

-- 5.3 Lessons UPDATE: Admins can update any; Teachers can update their own
create policy "Lessons update policy"
    on public.lessons
    for update
    using (
        public.is_org_admin(organization_id)
        or teacher_id = public.get_current_teacher_id()
    );

-- 5.4 Lessons DELETE: Only Admins can delete lessons
create policy "Lessons delete policy"
    on public.lessons
    for delete
    using (
        public.is_org_admin(organization_id)
    );

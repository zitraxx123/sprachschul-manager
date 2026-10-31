-- Migration: 20261031000001_fix_rls_recursion.sql
-- Fix infinite recursion in organization_members RLS policies

-- 1. Helper Function: get organization IDs current user belongs to
-- SECURITY DEFINER + owner to postgres ensures this runs without triggering RLS recursion
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

-- 2. Helper Function: check if current user is owner/admin of an organization
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

-- 3. Drop all existing recursive policies on organization_members
drop policy if exists "Users can view members of their organizations" on public.organization_members;
drop policy if exists "Owners and admins can manage members" on public.organization_members;
drop policy if exists "Users can add themselves during organization creation" on public.organization_members;
drop policy if exists "Members select policy" on public.organization_members;
drop policy if exists "Members insert policy" on public.organization_members;
drop policy if exists "Members update policy" on public.organization_members;
drop policy if exists "Members delete policy" on public.organization_members;

-- 4. Recreate clean, non-recursive policies on organization_members
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

-- 5. Fix update policy on organizations to also use is_org_admin (prevents any recursion)
drop policy if exists "Owners and admins can update their organization" on public.organizations;
create policy "Owners and admins can update their organization"
    on public.organizations
    for update
    using (public.is_org_admin(id));

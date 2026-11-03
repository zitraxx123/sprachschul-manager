-- Migration: SEPA-Lastschrift (Mandate je Schüler, Gläubiger-ID der Schule)

alter table public.organizations
    add column if not exists sepa_creditor_id text;

-- Bank data lives in its own table (admin-only) so teachers never see IBANs
-- through their read access to students.
create table if not exists public.student_sepa_mandates (
    student_id uuid primary key references public.students(id) on delete cascade,
    organization_id uuid not null references public.organizations(id) on delete cascade,
    account_holder text not null,
    iban text not null,
    bic text,
    mandate_ref text not null,
    mandate_date date not null,
    sequence_type text not null default 'FRST' check (sequence_type in ('FRST', 'RCUR')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (organization_id, mandate_ref)
);

create index if not exists idx_student_sepa_mandates_org on public.student_sepa_mandates (organization_id);

alter table public.student_sepa_mandates enable row level security;

drop policy if exists "Sepa mandates select policy" on public.student_sepa_mandates;
drop policy if exists "Sepa mandates insert policy" on public.student_sepa_mandates;
drop policy if exists "Sepa mandates update policy" on public.student_sepa_mandates;
drop policy if exists "Sepa mandates delete policy" on public.student_sepa_mandates;

create policy "Sepa mandates select policy"
    on public.student_sepa_mandates for select
    using (public.is_org_admin(organization_id));

create policy "Sepa mandates insert policy"
    on public.student_sepa_mandates for insert
    with check (public.is_org_admin(organization_id));

create policy "Sepa mandates update policy"
    on public.student_sepa_mandates for update
    using (public.is_org_admin(organization_id))
    with check (public.is_org_admin(organization_id));

create policy "Sepa mandates delete policy"
    on public.student_sepa_mandates for delete
    using (public.is_org_admin(organization_id));

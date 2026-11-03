-- Migration: Rechnungen (invoices) with gapless numbering (GoBD-oriented)

-- 1. Billing data of the school (issuer of the invoice)
alter table public.organizations
    add column if not exists address_street text,
    add column if not exists address_zip text,
    add column if not exists address_city text,
    add column if not exists tax_number text,
    add column if not exists vat_id text,
    add column if not exists iban text,
    add column if not exists bic text,
    add column if not exists bank_name text,
    add column if not exists invoice_payment_days integer not null default 14,
    add column if not exists invoice_vat_rate numeric(5,2) not null default 0,
    add column if not exists invoice_tax_note text;

alter table public.organizations drop constraint if exists organizations_invoice_payment_days_check;
alter table public.organizations
    add constraint organizations_invoice_payment_days_check check (invoice_payment_days between 0 and 365);

alter table public.organizations drop constraint if exists organizations_invoice_vat_rate_check;
alter table public.organizations
    add constraint organizations_invoice_vat_rate_check check (invoice_vat_rate between 0 and 100);

-- 2. Counter per organization and year (only reachable through create_invoice)
create table if not exists public.invoice_counters (
    organization_id uuid not null references public.organizations(id) on delete cascade,
    invoice_year integer not null,
    last_number integer not null default 0,
    primary key (organization_id, invoice_year)
);
alter table public.invoice_counters enable row level security;
-- intentionally no policies: direct access is forbidden

-- 3. Invoices
create table if not exists public.invoices (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    student_id uuid references public.students(id) on delete set null,
    student_name text not null,
    recipient_name text not null,
    month_year text not null check (month_year ~ '^\d{4}-(0[1-9]|1[0-2])$'),
    invoice_year integer not null,
    invoice_seq integer not null,
    invoice_number text not null,
    issue_date date not null,
    due_date date not null,
    items jsonb not null default '[]'::jsonb,
    net_amount numeric(10,2) not null check (net_amount >= 0),
    vat_rate numeric(5,2) not null default 0,
    vat_amount numeric(10,2) not null default 0,
    total_amount numeric(10,2) not null check (total_amount >= 0),
    status text not null default 'open' check (status in ('open', 'paid', 'cancelled')),
    paid_at timestamptz,
    cancelled_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (organization_id, invoice_number)
);

-- one live invoice per student and month
create unique index if not exists uq_invoices_student_month_live
    on public.invoices (organization_id, student_id, month_year)
    where status <> 'cancelled';

create index if not exists idx_invoices_org_month on public.invoices (organization_id, month_year);
create index if not exists idx_invoices_student on public.invoices (student_id);

alter table public.invoices enable row level security;

drop policy if exists "Invoices select policy" on public.invoices;
drop policy if exists "Invoices update policy" on public.invoices;

-- Only admins see and change invoices. Rows are created via create_invoice() only,
-- and there is deliberately no delete policy (cancel instead of delete).
create policy "Invoices select policy"
    on public.invoices for select
    using (public.is_org_admin(organization_id));

create policy "Invoices update policy"
    on public.invoices for update
    using (public.is_org_admin(organization_id))
    with check (public.is_org_admin(organization_id));

-- 4. Content of an issued invoice must not change; only the status fields may
create or replace function public.invoices_protect_content()
returns trigger
language plpgsql
as $$
begin
    if new.organization_id is distinct from old.organization_id
        or new.student_name is distinct from old.student_name
        or new.recipient_name is distinct from old.recipient_name
        or new.month_year is distinct from old.month_year
        or new.invoice_year is distinct from old.invoice_year
        or new.invoice_seq is distinct from old.invoice_seq
        or new.invoice_number is distinct from old.invoice_number
        or new.issue_date is distinct from old.issue_date
        or new.due_date is distinct from old.due_date
        or new.items is distinct from old.items
        or new.net_amount is distinct from old.net_amount
        or new.vat_rate is distinct from old.vat_rate
        or new.vat_amount is distinct from old.vat_amount
        or new.total_amount is distinct from old.total_amount
    then
        raise exception 'invoice_immutable';
    end if;
    if old.status = 'cancelled' and new.status is distinct from old.status then
        raise exception 'invoice_cancelled';
    end if;
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists trg_invoices_protect_content on public.invoices;
create trigger trg_invoices_protect_content
    before update on public.invoices
    for each row execute function public.invoices_protect_content();

-- 5. Atomic creation: number allocation and insert in one transaction => no gaps
create or replace function public.create_invoice(
    p_org uuid,
    p_student uuid,
    p_student_name text,
    p_recipient_name text,
    p_month_year text,
    p_issue_date date,
    p_due_date date,
    p_items jsonb,
    p_net numeric,
    p_vat_rate numeric,
    p_vat_amount numeric,
    p_total numeric,
    p_status text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    v_year integer := extract(year from p_issue_date)::integer;
    v_seq integer;
    v_id uuid;
begin
    if not public.is_org_admin(p_org) then
        raise exception 'forbidden';
    end if;

    if p_status not in ('open', 'paid') then
        raise exception 'invalid_status';
    end if;

    insert into public.invoice_counters (organization_id, invoice_year, last_number)
    values (p_org, v_year, 1)
    on conflict (organization_id, invoice_year)
    do update set last_number = public.invoice_counters.last_number + 1
    returning last_number into v_seq;

    insert into public.invoices (
        organization_id, student_id, student_name, recipient_name, month_year,
        invoice_year, invoice_seq, invoice_number, issue_date, due_date, items,
        net_amount, vat_rate, vat_amount, total_amount, status, paid_at
    ) values (
        p_org, p_student, p_student_name, p_recipient_name, p_month_year,
        v_year, v_seq, 'R-' || v_year || '-' || lpad(v_seq::text, 4, '0'), p_issue_date, p_due_date, p_items,
        p_net, p_vat_rate, p_vat_amount, p_total, p_status,
        case when p_status = 'paid' then now() else null end
    )
    returning id into v_id;

    return v_id;
end;
$$;

revoke all on function public.create_invoice(uuid, uuid, text, text, text, date, date, jsonb, numeric, numeric, numeric, numeric, text) from public;
grant execute on function public.create_invoice(uuid, uuid, text, text, text, date, date, jsonb, numeric, numeric, numeric, numeric, text) to authenticated;

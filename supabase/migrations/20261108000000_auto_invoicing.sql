-- Migration: Automatische Rechnungserstellung (Cron) - Opt-in je Schule + Systemfunktion

alter table public.organizations
    add column if not exists auto_invoice_enabled boolean not null default false;

-- Same as create_invoice(), but without the admin check (there is no logged-in user in a cron run).
-- Only the service role may execute it.
create or replace function public.create_invoice_system(
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

revoke all on function public.create_invoice_system(uuid, uuid, text, text, text, date, date, jsonb, numeric, numeric, numeric, numeric, text) from public, anon, authenticated;
grant execute on function public.create_invoice_system(uuid, uuid, text, text, text, date, date, jsonb, numeric, numeric, numeric, numeric, text) to service_role;

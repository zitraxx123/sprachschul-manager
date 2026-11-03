-- Migration: Änderungsprotokoll (wer hat was geändert), v. a. Rechnungen und Zahlungen

create table if not exists public.audit_log (
    id bigint generated always as identity primary key,
    organization_id uuid not null references public.organizations(id) on delete cascade,
    actor_id uuid,
    actor_email text,
    table_name text not null,
    record_id text,
    action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
    old_data jsonb,
    new_data jsonb,
    created_at timestamptz not null default now()
);

create index if not exists idx_audit_log_org_created on public.audit_log (organization_id, created_at desc);
create index if not exists idx_audit_log_org_table on public.audit_log (organization_id, table_name);

alter table public.audit_log enable row level security;

drop policy if exists "Audit log select policy" on public.audit_log;
-- Only school admins can read. There are deliberately no insert/update/delete policies:
-- rows are written by the trigger function only and cannot be changed afterwards.
create policy "Audit log select policy"
    on public.audit_log for select
    using (public.is_org_admin(organization_id));

-- Generic trigger: for UPDATE only the changed columns are stored (old and new value).
create or replace function public.log_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_old jsonb;
    v_new jsonb;
    v_old_diff jsonb := '{}'::jsonb;
    v_new_diff jsonb := '{}'::jsonb;
    v_key text;
    v_org uuid;
    v_record text;
    v_email text;
begin
    if tg_op = 'DELETE' then
        v_old := to_jsonb(old);
    elsif tg_op = 'INSERT' then
        v_new := to_jsonb(new);
    else
        v_old := to_jsonb(old);
        v_new := to_jsonb(new);
    end if;

    -- Never store full bank account numbers in the log
    if tg_table_name = 'student_sepa_mandates' then
        if v_old ? 'iban' then
            v_old := jsonb_set(v_old, '{iban}', to_jsonb('****' || right(coalesce(v_old->>'iban', ''), 4)));
        end if;
        if v_new ? 'iban' then
            v_new := jsonb_set(v_new, '{iban}', to_jsonb('****' || right(coalesce(v_new->>'iban', ''), 4)));
        end if;
    end if;

    if tg_op = 'UPDATE' then
        for v_key in select jsonb_object_keys(v_new) loop
            if v_key <> 'updated_at' and (v_old -> v_key) is distinct from (v_new -> v_key) then
                v_old_diff := v_old_diff || jsonb_build_object(v_key, v_old -> v_key);
                v_new_diff := v_new_diff || jsonb_build_object(v_key, v_new -> v_key);
            end if;
        end loop;
        if v_new_diff = '{}'::jsonb then
            return new;
        end if;
        v_old := v_old_diff;
        v_new := v_new_diff;
    end if;

    if tg_op = 'DELETE' then
        v_org := (to_jsonb(old) ->> 'organization_id')::uuid;
        v_record := coalesce(to_jsonb(old) ->> 'id', to_jsonb(old) ->> 'student_id');
    else
        v_org := (to_jsonb(new) ->> 'organization_id')::uuid;
        v_record := coalesce(to_jsonb(new) ->> 'id', to_jsonb(new) ->> 'student_id');
    end if;

    if v_org is null then
        return coalesce(new, old);
    end if;

    if auth.uid() is not null then
        select email into v_email from auth.users where id = auth.uid();
    end if;

    insert into public.audit_log (organization_id, actor_id, actor_email, table_name, record_id, action, old_data, new_data)
    values (v_org, auth.uid(), v_email, tg_table_name, v_record, tg_op, v_old, v_new);

    return coalesce(new, old);
exception
    when others then
        -- The log must never block the actual business operation
        raise warning 'audit log failed: %', sqlerrm;
        return coalesce(new, old);
end;
$$;

revoke all on function public.log_audit() from public;

drop trigger if exists audit_invoices on public.invoices;
create trigger audit_invoices
    after insert or update or delete on public.invoices
    for each row execute function public.log_audit();

drop trigger if exists audit_monthly_payments on public.monthly_payments;
create trigger audit_monthly_payments
    after insert or update or delete on public.monthly_payments
    for each row execute function public.log_audit();

drop trigger if exists audit_students on public.students;
create trigger audit_students
    after insert or update or delete on public.students
    for each row execute function public.log_audit();

drop trigger if exists audit_teachers on public.teachers;
create trigger audit_teachers
    after insert or update or delete on public.teachers
    for each row execute function public.log_audit();

drop trigger if exists audit_student_courses on public.student_courses;
create trigger audit_student_courses
    after insert or update or delete on public.student_courses
    for each row execute function public.log_audit();

drop trigger if exists audit_student_sepa_mandates on public.student_sepa_mandates;
create trigger audit_student_sepa_mandates
    after insert or update or delete on public.student_sepa_mandates
    for each row execute function public.log_audit();

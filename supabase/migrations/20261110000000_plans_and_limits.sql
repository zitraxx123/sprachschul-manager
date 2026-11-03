-- Migration: Tarife und Limits (Free / Starter / Professional / Enterprise)

create table if not exists public.plans (
    key text primary key,
    name text not null,
    max_students integer,          -- null = unbegrenzt
    max_teachers integer,          -- null = unbegrenzt
    monthly_price_eur numeric(8,2) not null default 0,
    sort_order integer not null default 0
);

-- Werte nach audit_report.md (Freemium-Modell). Anpassbar per SQL, bestehende Zeilen werden nicht überschrieben.
insert into public.plans (key, name, max_students, max_teachers, monthly_price_eur, sort_order) values
    ('free',         'Free',         5,    2,    0,   1),
    ('starter',      'Starter',      30,   5,    29,  2),
    ('professional', 'Professional', null, null, 79,  3),
    ('enterprise',   'Enterprise',   null, null, 149, 4)
on conflict (key) do nothing;

alter table public.plans enable row level security;
drop policy if exists "Plans select policy" on public.plans;
create policy "Plans select policy" on public.plans for select to authenticated using (true);

-- Bestehende Schulen behalten unbegrenzten Zugang (enterprise), neue Schulen starten mit free.
alter table public.organizations add column if not exists plan text not null default 'enterprise';
alter table public.organizations alter column plan set default 'free';

do $$
begin
    if not exists (select 1 from pg_constraint where conname = 'organizations_plan_fkey') then
        alter table public.organizations
            add constraint organizations_plan_fkey foreign key (plan) references public.plans(key);
    end if;
end $$;

-- Kunden dürfen ihren Tarif nicht selbst setzen (nur Service-Role / SQL-Editor, auth.uid() ist dort null)
create or replace function public.protect_organization_plan()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if auth.uid() is not null then
        if tg_op = 'INSERT' then
            new.plan := 'free';
        elsif new.plan is distinct from old.plan then
            raise exception 'plan_change_forbidden';
        end if;
    end if;
    return new;
end;
$$;

drop trigger if exists protect_organization_plan on public.organizations;
create trigger protect_organization_plan
    before insert or update on public.organizations
    for each row execute function public.protect_organization_plan();

-- Limits durchsetzen
create or replace function public.enforce_plan_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_limit integer;
    v_count integer;
begin
    if tg_table_name = 'students' then
        select p.max_students into v_limit
        from public.organizations o join public.plans p on p.key = o.plan
        where o.id = new.organization_id;
        if v_limit is not null then
            select count(*) into v_count from public.students where organization_id = new.organization_id;
            if v_count >= v_limit then
                raise exception 'plan_limit_students';
            end if;
        end if;
    elsif tg_table_name = 'teachers' then
        select p.max_teachers into v_limit
        from public.organizations o join public.plans p on p.key = o.plan
        where o.id = new.organization_id;
        if v_limit is not null then
            select count(*) into v_count from public.teachers where organization_id = new.organization_id;
            if v_count >= v_limit then
                raise exception 'plan_limit_teachers';
            end if;
        end if;
    end if;
    return new;
end;
$$;

drop trigger if exists enforce_plan_limit_students on public.students;
create trigger enforce_plan_limit_students
    before insert on public.students
    for each row execute function public.enforce_plan_limit();

drop trigger if exists enforce_plan_limit_teachers on public.teachers;
create trigger enforce_plan_limit_teachers
    before insert on public.teachers
    for each row execute function public.enforce_plan_limit();

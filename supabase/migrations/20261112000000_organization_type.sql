-- Migration: Art der Einrichtung (steuert die Begriffe in der Oberfläche) + Registrierung mit Typ

alter table public.organizations
    add column if not exists org_type text not null default 'language_school';

do $$
begin
    if not exists (select 1 from pg_constraint where conname = 'organizations_org_type_check') then
        alter table public.organizations
            add constraint organizations_org_type_check
            check (org_type in ('language_school', 'dance_school', 'music_school', 'other'));
    end if;
end $$;

-- Registrierung: Typ aus den Nutzer-Metadaten übernehmen (sonst language_school).
-- Sonst identisch zu handle_new_user() aus 20261031000002_teacher_portal_and_rls.sql
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    new_org_id uuid;
    org_name text;
    org_type_value text;
    teacher_record record;
    has_teacher_invite boolean := false;
begin
    -- Check if this user was already invited as a teacher
    for teacher_record in
        select id, organization_id from public.teachers
        where lower(email) = lower(trim(new.email))
    loop
        has_teacher_invite := true;
        update public.teachers set user_id = new.id where id = teacher_record.id;
        insert into public.organization_members (organization_id, user_id, role)
        values (teacher_record.organization_id, new.id, 'teacher')
        on conflict (organization_id, user_id) do nothing;
    end loop;

    -- Only create a new organization if the user is a school owner/admin (not an invited teacher)
    if not has_teacher_invite then
        org_name := coalesce(nullif(trim(new.raw_user_meta_data->>'organization_name'), ''), 'Meine Sprachschule');
        org_type_value := coalesce(new.raw_user_meta_data->>'organization_type', 'language_school');
        if org_type_value not in ('language_school', 'dance_school', 'music_school', 'other') then
            org_type_value := 'language_school';
        end if;

        insert into public.organizations (name, org_type)
        values (org_name, org_type_value)
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

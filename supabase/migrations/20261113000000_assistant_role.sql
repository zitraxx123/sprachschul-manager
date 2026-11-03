-- Migration: Rolle "assistant" (Administrationsassistenz) + Einladungen
--
-- Assistenz darf: Schueler, Kurse, Stundenplan, Anwesenheit, Raeume, Monatszahlungen (Haken "bezahlt").
-- Assistenz darf NICHT: Lehrkraefte-Tabelle (Stundensaetze, Steuer-ID), Rechnungen, SEPA, Audit-Log,
--   Einstellungen/Tarif, Loeschen von Schuelern/Kursen/Lehrkraeften.
-- Lehrernamen bekommt die Assistenz ueber die View teachers_directory (ohne Saetze und Steuerdaten).

-- 1. Rolle erlauben --------------------------------------------------------
alter table public.organization_members
    drop constraint if exists organization_members_role_check;
alter table public.organization_members
    add constraint organization_members_role_check
    check (role in ('owner', 'admin', 'assistant', 'teacher'));

-- 2. Hilfsfunktionen -------------------------------------------------------
create or replace function public.is_org_staff(org_id uuid)
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
          and role in ('owner', 'admin', 'assistant')
    );
$$;
alter function public.is_org_staff(uuid) owner to postgres;

create or replace function public.org_has_members(org_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
    select exists (select 1 from public.organization_members where organization_id = org_id);
$$;
alter function public.org_has_members(uuid) owner to postgres;

-- 3. Luecke schliessen: sich selbst in eine fremde Schule eintragen ---------
-- Bisher: user_id = auth.uid() reichte (auch mit role 'owner' in jeder Schule).
-- Jetzt: nur Admins duerfen Mitglieder hinzufuegen; Selbsteintrag nur als Owner einer Schule ohne Mitglieder.
drop policy if exists "Members insert policy" on public.organization_members;
create policy "Members insert policy"
    on public.organization_members
    for insert
    to authenticated
    with check (
        public.is_org_admin(organization_id)
        or (
            user_id = auth.uid()
            and role = 'owner'
            and not public.org_has_members(organization_id)
        )
    );

-- 4. Lehrer-Verzeichnis ohne Stundensaetze ---------------------------------
-- View laeuft mit den Rechten des Besitzers (umgeht RLS der Tabelle), filtert aber selbst auf die eigene Schule.
create or replace view public.teachers_directory as
    select t.id, t.organization_id, t.name, t.email
    from public.teachers t
    where public.is_org_staff(t.organization_id);

revoke all on public.teachers_directory from anon;
grant select on public.teachers_directory to authenticated;

-- 5. Einladungen -----------------------------------------------------------
create table if not exists public.organization_invites (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    email text not null,
    role text not null default 'assistant' check (role in ('assistant')),
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now()
);
create unique index if not exists idx_org_invites_unique on public.organization_invites (organization_id, lower(email));
alter table public.organization_invites enable row level security;

drop policy if exists "Org invites select policy" on public.organization_invites;
drop policy if exists "Org invites insert policy" on public.organization_invites;
drop policy if exists "Org invites delete policy" on public.organization_invites;
create policy "Org invites select policy" on public.organization_invites
    for select using (public.is_org_admin(organization_id));
create policy "Org invites insert policy" on public.organization_invites
    for insert to authenticated with check (public.is_org_admin(organization_id));
create policy "Org invites delete policy" on public.organization_invites
    for delete using (public.is_org_admin(organization_id));

-- handle_new_user: wie 20261112000000, plus Einladung als Assistenz
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
    invite_record record;
    has_invite boolean := false;
begin
    -- Eingeladen als Assistenz?
    for invite_record in
        select id, organization_id, role from public.organization_invites
        where lower(email) = lower(trim(new.email))
    loop
        has_invite := true;
        insert into public.organization_members (organization_id, user_id, role)
        values (invite_record.organization_id, new.id, invite_record.role)
        on conflict (organization_id, user_id) do nothing;
        delete from public.organization_invites where id = invite_record.id;
    end loop;

    -- Eingeladen als Lehrkraft?
    for teacher_record in
        select id, organization_id from public.teachers
        where lower(email) = lower(trim(new.email))
    loop
        has_invite := true;
        update public.teachers set user_id = new.id where id = teacher_record.id;
        insert into public.organization_members (organization_id, user_id, role)
        values (teacher_record.organization_id, new.id, 'teacher')
        on conflict (organization_id, user_id) do nothing;
    end loop;

    -- Nur ohne Einladung eine neue Schule anlegen
    if not has_invite then
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

-- 6. Policies fuer Assistenz (is_org_staff = owner/admin/assistant) --------
-- students: lesen + anlegen (Loeschen bleibt Admin)
drop policy if exists "Students select policy" on public.students;
create policy "Students select policy" on public.students for select using (
    public.is_org_staff(organization_id)
    or (organization_id in (select public.get_user_org_ids()) and public.can_access_student(id))
);
drop policy if exists "Students insert policy" on public.students;
create policy "Students insert policy" on public.students for insert to authenticated
    with check (public.is_org_staff(organization_id));

-- student_courses: lesen
drop policy if exists "Student courses select policy" on public.student_courses;
create policy "Student courses select policy" on public.student_courses for select using (
    public.is_org_staff(organization_id)
    or (organization_id in (select public.get_user_org_ids()) and public.can_access_course_roster(course_id))
);

-- courses: anlegen + aendern (Loeschen bleibt Admin)
drop policy if exists "Courses insert policy" on public.courses;
create policy "Courses insert policy" on public.courses for insert to authenticated
    with check (public.is_org_staff(organization_id));
drop policy if exists "Courses update policy" on public.courses;
create policy "Courses update policy" on public.courses for update
    using (public.is_org_staff(organization_id));

-- course_schedules: Stundenplan pflegen
drop policy if exists "Course schedules insert policy" on public.course_schedules;
create policy "Course schedules insert policy" on public.course_schedules for insert to authenticated with check (
    exists (select 1 from public.courses c where c.id = course_schedules.course_id and public.is_org_staff(c.organization_id))
);
drop policy if exists "Course schedules update policy" on public.course_schedules;
create policy "Course schedules update policy" on public.course_schedules for update using (
    exists (select 1 from public.courses c where c.id = course_schedules.course_id and public.is_org_staff(c.organization_id))
);
drop policy if exists "Course schedules delete policy" on public.course_schedules;
create policy "Course schedules delete policy" on public.course_schedules for delete using (
    exists (select 1 from public.courses c where c.id = course_schedules.course_id and public.is_org_staff(c.organization_id))
);

-- monthly_payments: Haken "bezahlt" (Loeschen bleibt Admin)
drop policy if exists "Monthly payments insert policy" on public.monthly_payments;
create policy "Monthly payments insert policy" on public.monthly_payments for insert to authenticated
    with check (public.is_org_staff(organization_id));
drop policy if exists "Monthly payments update policy" on public.monthly_payments;
create policy "Monthly payments update policy" on public.monthly_payments for update
    using (public.is_org_staff(organization_id));

-- lessons: Termine sehen/anlegen/aendern (Loeschen bleibt Admin)
drop policy if exists "Lessons select policy" on public.lessons;
create policy "Lessons select policy" on public.lessons for select using (
    public.is_org_staff(organization_id) or teacher_id = public.get_current_teacher_id()
);
drop policy if exists "Lessons insert policy" on public.lessons;
create policy "Lessons insert policy" on public.lessons for insert to authenticated with check (
    public.is_org_staff(organization_id)
    or (organization_id in (select public.get_user_org_ids()) and teacher_id = public.get_current_teacher_id())
);
drop policy if exists "Lessons update policy" on public.lessons;
create policy "Lessons update policy" on public.lessons for update using (
    public.is_org_staff(organization_id) or teacher_id = public.get_current_teacher_id()
);

-- lesson_overrides: Verschiebungen / Vertretungen
drop policy if exists "Lesson overrides select policy" on public.lesson_overrides;
create policy "Lesson overrides select policy" on public.lesson_overrides for select using (
    public.is_org_staff(organization_id)
    or new_teacher_id = public.get_current_teacher_id()
    or original_teacher_id = public.get_current_teacher_id()
);
drop policy if exists "Lesson overrides insert policy" on public.lesson_overrides;
create policy "Lesson overrides insert policy" on public.lesson_overrides for insert to authenticated
    with check (public.is_org_staff(organization_id));
drop policy if exists "Lesson overrides update policy" on public.lesson_overrides;
create policy "Lesson overrides update policy" on public.lesson_overrides for update
    using (public.is_org_staff(organization_id));
drop policy if exists "Lesson overrides delete policy" on public.lesson_overrides;
create policy "Lesson overrides delete policy" on public.lesson_overrides for delete
    using (public.is_org_staff(organization_id));

-- Unveraendert (Assistenz hat KEINEN Zugriff): teachers, invoices, invoice_counters,
-- student_sepa_mandates, audit_log, organizations (Update), Loeschen von Schuelern/Kursen/Terminen.

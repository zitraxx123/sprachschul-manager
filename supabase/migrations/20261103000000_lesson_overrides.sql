-- Migration: 20261103000000_lesson_overrides.sql
-- Description: Single-occurrence exceptions to the recurring course schedule
--              (moved lesson / substitute teacher / cancelled), keyed by course + original date + original start time.
--              The course template (courses / course_schedules) is never modified by an override.

create table if not exists public.lesson_overrides (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    course_id uuid not null references public.courses(id) on delete cascade,

    -- Identity of the template occurrence being overridden
    lesson_date date not null,
    original_start_time text not null,           -- 'HH:MM'

    -- What changed (NULL = unchanged vs. template)
    new_date date,
    new_start_time text,                         -- 'HH:MM'
    new_duration numeric(4,2) check (new_duration is null or new_duration > 0),
    new_teacher_id uuid references public.teachers(id) on delete set null,
    original_teacher_id uuid references public.teachers(id) on delete set null,

    reason text,
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint lesson_overrides_unique_occurrence unique (course_id, lesson_date, original_start_time)
);

comment on table public.lesson_overrides is 'One-off exceptions to the weekly course template (Terminverschiebung / Vertretung)';

create index if not exists idx_lesson_overrides_org_date on public.lesson_overrides(organization_id, lesson_date);
create index if not exists idx_lesson_overrides_new_teacher on public.lesson_overrides(new_teacher_id);
create index if not exists idx_lesson_overrides_original_teacher on public.lesson_overrides(original_teacher_id);
create index if not exists idx_lesson_overrides_course on public.lesson_overrides(course_id);

alter table public.lesson_overrides enable row level security;

drop policy if exists "Lesson overrides select policy" on public.lesson_overrides;
drop policy if exists "Lesson overrides insert policy" on public.lesson_overrides;
drop policy if exists "Lesson overrides update policy" on public.lesson_overrides;
drop policy if exists "Lesson overrides delete policy" on public.lesson_overrides;

-- Admins/owners see everything; teachers see only overrides that involve them
-- (as substitute or as the teacher who was replaced).
create policy "Lesson overrides select policy"
    on public.lesson_overrides
    for select
    using (
        public.is_org_admin(organization_id)
        or new_teacher_id = public.get_current_teacher_id()
        or original_teacher_id = public.get_current_teacher_id()
    );

create policy "Lesson overrides insert policy"
    on public.lesson_overrides
    for insert
    to authenticated
    with check (public.is_org_admin(organization_id));

create policy "Lesson overrides update policy"
    on public.lesson_overrides
    for update
    using (public.is_org_admin(organization_id));

create policy "Lesson overrides delete policy"
    on public.lesson_overrides
    for delete
    using (public.is_org_admin(organization_id));

-- keep updated_at fresh
create or replace function public.touch_lesson_override_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at := now();
    return new;
end;
$$;

drop trigger if exists trg_lesson_overrides_touch on public.lesson_overrides;
create trigger trg_lesson_overrides_touch
    before update on public.lesson_overrides
    for each row execute function public.touch_lesson_override_updated_at();

-- ---------------------------------------------------------------------------
-- Teacher iCal feed: additionally return one-off overrides that involve the
-- teacher (as substitute, or as the teacher who was replaced/moved).
-- Existing keys (teacher, organization_name, courses) are unchanged.
-- ---------------------------------------------------------------------------
create or replace function public.get_teacher_calendar_data(p_teacher_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_teacher jsonb;
    v_org_name text;
    v_courses jsonb;
    v_overrides jsonb;
begin
    select
        jsonb_build_object('id', t.id, 'name', t.name, 'email', t.email),
        o.name
    into v_teacher, v_org_name
    from public.teachers t
    left join public.organizations o on o.id = t.organization_id
    where t.id = p_teacher_id;

    if v_teacher is null then
        return null;
    end if;

    select coalesce(jsonb_agg(
        jsonb_build_object(
            'id', c.id,
            'name', c.name,
            'course_type', c.course_type,
            'description', c.description,
            'room_name', r.name,
            'schedules', (
                select coalesce(jsonb_agg(
                    jsonb_build_object(
                        'id', cs.id,
                        'day_of_week', cs.day_of_week,
                        'start_time', cs.start_time,
                        'duration', cs.duration
                    )
                ), '[]'::jsonb)
                from public.course_schedules cs
                where cs.course_id = c.id
            ),
            'students', (
                select coalesce(jsonb_agg(
                    trim(concat(s.first_name, ' ', s.last_name))
                ), '[]'::jsonb)
                from public.student_courses sc
                join public.students s on s.id = sc.student_id
                where sc.course_id = c.id
            )
        )
    ), '[]'::jsonb) into v_courses
    from public.courses c
    left join public.rooms r on r.id = c.room_id
    where c.teacher_id = p_teacher_id;

    select coalesce(jsonb_agg(
        jsonb_build_object(
            'course_id', lo.course_id,
            'course_name', c.name,
            'course_type', c.course_type,
            'room_name', r.name,
            'lesson_date', lo.lesson_date,
            'original_start_time', lo.original_start_time,
            'new_date', lo.new_date,
            'new_start_time', lo.new_start_time,
            'new_duration', lo.new_duration,
            'new_teacher_id', lo.new_teacher_id,
            'original_teacher_id', lo.original_teacher_id,
            'template_teacher_id', c.teacher_id,
            'template_duration', (
                select cs.duration from public.course_schedules cs
                where cs.course_id = lo.course_id
                  and left(cs.start_time::text, 5) = lo.original_start_time
                limit 1
            )
        )
    ), '[]'::jsonb) into v_overrides
    from public.lesson_overrides lo
    join public.courses c on c.id = lo.course_id
    left join public.rooms r on r.id = c.room_id
    where lo.lesson_date >= (current_date - 30)
      and (lo.new_teacher_id = p_teacher_id or lo.original_teacher_id = p_teacher_id
           or (lo.new_teacher_id is null and c.teacher_id = p_teacher_id));

    return jsonb_build_object(
        'teacher', v_teacher,
        'organization_name', v_org_name,
        'courses', v_courses,
        'overrides', v_overrides
    );
end;
$$;

grant execute on function public.get_teacher_calendar_data(uuid) to anon, authenticated, service_role;

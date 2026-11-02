-- Migration: 20261103030000_course_capacity_enforcement.sql
-- Description: Trial lessons (Schnupperstunde) & waiting list (Warteliste) - database-level capacity rule.
--   * courses.max_capacity          (int, default 10)  - already added by 20261101010000, re-asserted here
--   * student_courses.status        ('active' | 'trial' | 'waiting', default 'active') - same
--   * NEW: capacity can never be exceeded by 'active' students, regardless of which code path writes:
--       - INSERT as 'active' into a full course  -> silently stored as 'waiting' (list-order safe)
--       - UPDATE to 'active' in a full course    -> rejected with check_violation ('course_full')
-- Idempotent: safe to run more than once.

-- ---------------------------------------------------------------------------
-- 1. Columns & constraints (no-op if 20261101010000 was already applied)
-- ---------------------------------------------------------------------------
alter table public.courses
    add column if not exists max_capacity integer not null default 10;

-- NOT VALID: do not fail on legacy rows, but enforce for every new/changed row
alter table public.courses drop constraint if exists courses_max_capacity_positive;
alter table public.courses
    add constraint courses_max_capacity_positive check (max_capacity >= 1) not valid;

alter table public.student_courses
    add column if not exists status text not null default 'active';

alter table public.student_courses drop constraint if exists student_courses_status_check;
alter table public.student_courses
    add constraint student_courses_status_check check (status in ('active', 'trial', 'waiting'));

create index if not exists idx_student_courses_status on public.student_courses(status);
create index if not exists idx_student_courses_course_status on public.student_courses(course_id, status);

-- ---------------------------------------------------------------------------
-- 2. Capacity enforcement trigger
-- ---------------------------------------------------------------------------
create or replace function public.enforce_course_capacity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_max integer;
    v_active integer;
begin
    -- Only 'active' enrollments count against the capacity
    if new.status is distinct from 'active' then
        return new;
    end if;

    -- Already active before -> nothing changes
    if tg_op = 'UPDATE' and old.status = 'active' then
        return new;
    end if;

    -- Serialize concurrent enrollments into the same course
    select c.max_capacity into v_max
    from public.courses c
    where c.id = new.course_id
    for update;

    if v_max is null then
        return new;
    end if;

    select count(*) into v_active
    from public.student_courses sc
    where sc.course_id = new.course_id
      and sc.status = 'active'
      and sc.id is distinct from new.id;

    if v_active >= v_max then
        if tg_op = 'INSERT' then
            new.status := 'waiting';
            return new;
        end if;
        raise exception 'course_full: maximum of % active participants reached', v_max
            using errcode = 'check_violation';
    end if;

    return new;
end;
$$;

drop trigger if exists trg_enforce_course_capacity on public.student_courses;
create trigger trg_enforce_course_capacity
    before insert or update of status on public.student_courses
    for each row execute function public.enforce_course_capacity();

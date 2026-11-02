-- Migration: 20261101020000_teacher_calendar_feed.sql
-- Description: Provide secure public calendar feed RPC for teacher subscriptions without exposing credentials

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
begin
    -- 1. Get teacher info and school name
    select 
        jsonb_build_object(
            'id', t.id,
            'name', t.name,
            'email', t.email
        ),
        o.name
    into v_teacher, v_org_name
    from public.teachers t
    left join public.organizations o on o.id = t.organization_id
    where t.id = p_teacher_id;

    if v_teacher is null then
        return null;
    end if;

    -- 2. Get courses with schedules, rooms and students
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

    return jsonb_build_object(
        'teacher', v_teacher,
        'organization_name', v_org_name,
        'courses', v_courses
    );
end;
$$;

-- Grant execution to anon, authenticated and service_role
grant execute on function public.get_teacher_calendar_data(uuid) to anon, authenticated, service_role;

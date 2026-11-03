-- Migration: Vertragsdaten (Laufzeit & Kündigung) je Kurs-Anmeldung

alter table public.student_courses
    add column if not exists contract_start date,
    add column if not exists contract_end date,
    add column if not exists notice_period_weeks integer not null default 4,
    add column if not exists cancelled_on date;

alter table public.student_courses drop constraint if exists student_courses_notice_period_check;
alter table public.student_courses
    add constraint student_courses_notice_period_check check (notice_period_weeks between 0 and 52);

alter table public.student_courses drop constraint if exists student_courses_contract_dates_check;
alter table public.student_courses
    add constraint student_courses_contract_dates_check
    check (contract_start is null or contract_end is null or contract_end >= contract_start);

comment on column public.student_courses.contract_start is 'Vertragsbeginn (NULL = unbegrenzt/nicht erfasst)';
comment on column public.student_courses.contract_end is 'Vertragsende (NULL = laufend)';
comment on column public.student_courses.cancelled_on is 'Datum, an dem die Kündigung erklärt wurde';

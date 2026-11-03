-- Migration: Beschäftigungsart, Steuer-ID und Minijob-Grenze

alter table public.teachers
    add column if not exists employment_type text not null default 'honorar',
    add column if not exists tax_id text;

alter table public.teachers drop constraint if exists teachers_employment_type_check;
alter table public.teachers
    add constraint teachers_employment_type_check
    check (employment_type in ('honorar', 'minijob', 'teilzeit'));

-- Monatliche Minijob-Verdienstgrenze der Schule (Standard 2026: 603 EUR), anpassbar in den Einstellungen
alter table public.organizations
    add column if not exists minijob_monthly_limit numeric(8,2) not null default 603.00;

alter table public.organizations drop constraint if exists organizations_minijob_monthly_limit_check;
alter table public.organizations
    add constraint organizations_minijob_monthly_limit_check check (minijob_monthly_limit >= 0);

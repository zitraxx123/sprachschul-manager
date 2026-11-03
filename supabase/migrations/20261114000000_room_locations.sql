-- Migration: Standort/Filiale als Textmarke am Raum (nur zum Filtern, keine eigenen Zugriffsrechte)
alter table public.rooms
    add column if not exists location text;

alter table public.rooms drop constraint if exists rooms_location_length;
alter table public.rooms
    add constraint rooms_location_length check (location is null or char_length(location) <= 80);

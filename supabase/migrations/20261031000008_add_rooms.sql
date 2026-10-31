-- Migration: 20261031000008_add_rooms.sql
-- Description: Create rooms table and link to courses via room_id

-- 1. Create rooms table
CREATE TABLE IF NOT EXISTS public.rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.rooms IS 'Classrooms and physical/virtual locations (e.g. Raum 1, Raum 2, Online)';

CREATE INDEX IF NOT EXISTS idx_rooms_organization_id ON public.rooms(organization_id);

-- 2. Add room_id to courses table
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_courses_room_id ON public.courses(room_id);

-- 3. Enable Row Level Security (RLS) on rooms
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- 4. RLS policies for rooms
DROP POLICY IF EXISTS "Rooms select policy" ON public.rooms;
DROP POLICY IF EXISTS "Rooms insert policy" ON public.rooms;
DROP POLICY IF EXISTS "Rooms update policy" ON public.rooms;
DROP POLICY IF EXISTS "Rooms delete policy" ON public.rooms;

CREATE POLICY "Rooms select policy"
    ON public.rooms
    FOR SELECT
    USING (organization_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "Rooms insert policy"
    ON public.rooms
    FOR INSERT
    TO authenticated
    WITH CHECK (organization_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "Rooms update policy"
    ON public.rooms
    FOR UPDATE
    USING (organization_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "Rooms delete policy"
    ON public.rooms
    FOR DELETE
    USING (organization_id IN (SELECT public.get_user_org_ids()));

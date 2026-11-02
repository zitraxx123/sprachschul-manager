-- Migration: Add logo_url to organizations and setup Supabase Storage bucket 'logos'

-- 1. Add logo_url column to organizations
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS logo_url TEXT NULL;

-- 2. Create public storage bucket 'logos'
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 3. Storage RLS Policies for 'logos' bucket

-- Allow public read access to all logos
DROP POLICY IF EXISTS "Logos are publicly accessible" ON storage.objects;
CREATE POLICY "Logos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'logos');

-- Allow authenticated organization members to insert logo files
DROP POLICY IF EXISTS "Members can upload logos" ON storage.objects;
CREATE POLICY "Members can upload logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'logos' AND
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.user_id = auth.uid()
    AND (
      om.organization_id::text = (storage.foldername(name))[1]
      OR om.organization_id::text = split_part(name, '/', 1)
    )
  )
);

-- Allow authenticated organization members to update logo files
DROP POLICY IF EXISTS "Members can update logos" ON storage.objects;
CREATE POLICY "Members can update logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'logos' AND
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.user_id = auth.uid()
    AND (
      om.organization_id::text = (storage.foldername(name))[1]
      OR om.organization_id::text = split_part(name, '/', 1)
    )
  )
);

-- Allow authenticated organization members to delete logo files
DROP POLICY IF EXISTS "Members can delete logos" ON storage.objects;
CREATE POLICY "Members can delete logos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'logos' AND
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.user_id = auth.uid()
    AND (
      om.organization_id::text = (storage.foldername(name))[1]
      OR om.organization_id::text = split_part(name, '/', 1)
    )
  )
);

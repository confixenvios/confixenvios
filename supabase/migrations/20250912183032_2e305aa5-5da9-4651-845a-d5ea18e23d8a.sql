-- Fix storage policies for motorista occurrences
-- Problem: Motoristas don't use Supabase Auth, so auth.uid() is NULL
-- Solution: Allow uploads to shipment buckets without auth requirement

-- Drop existing restrictive policies for shipment-photos
DROP POLICY IF EXISTS "Motoristas can upload shipment photos" ON storage.objects;
DROP POLICY IF EXISTS "Motoristas can view own uploaded photos" ON storage.objects;

-- Drop existing restrictive policies for shipment-audio (if any exist with auth requirements)
DROP POLICY IF EXISTS "Administradores podem gerenciar áudios" ON storage.objects;
DROP POLICY IF EXISTS "Allow admins to view audio files" ON storage.objects;

-- Create permissive policies for shipment-photos bucket
CREATE POLICY "Allow upload to shipment-photos bucket"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'shipment-photos');

CREATE POLICY "Allow public read of shipment-photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'shipment-photos');

CREATE POLICY "Admins can manage shipment-photos"
ON storage.objects FOR ALL
USING (bucket_id = 'shipment-photos' AND has_role(auth.uid(), 'admin'::app_role));

-- Create permissive policies for shipment-audio bucket (replace existing ones)
DROP POLICY IF EXISTS "Permitir upload de áudio para shipment-audio" ON storage.objects;
DROP POLICY IF EXISTS "Permitir visualização de áudios do bucket shipment-audio" ON storage.objects;

CREATE POLICY "Allow upload to shipment-audio bucket"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'shipment-audio');

CREATE POLICY "Allow public read of shipment-audio"
ON storage.objects FOR SELECT
USING (bucket_id = 'shipment-audio');

CREATE POLICY "Admins can manage shipment-audio"
ON storage.objects FOR ALL
USING (bucket_id = 'shipment-audio' AND has_role(auth.uid(), 'admin'::app_role));

-- Update bucket to be public for easier access
UPDATE storage.buckets 
SET public = true 
WHERE name = 'shipment-photos';
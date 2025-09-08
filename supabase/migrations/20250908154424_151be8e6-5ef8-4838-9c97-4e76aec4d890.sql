-- Create storage bucket for shipment audio recordings if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('shipment-audio', 'shipment-audio', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for audio files
-- Allow authenticated users (motoristas) to upload audio files
CREATE POLICY "Allow motoristas to upload audio files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'shipment-audio' 
  AND auth.uid() IS NOT NULL
);

-- Allow admins to view all audio files
CREATE POLICY "Allow admins to view audio files" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'shipment-audio' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Allow motoristas to view their own uploaded audio files
CREATE POLICY "Allow motoristas to view their own audio files" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'shipment-audio' 
  AND auth.uid() = owner
);
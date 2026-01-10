-- Drop the restrictive SELECT policy
DROP POLICY IF EXISTS "Users can view ticket attachments" ON storage.objects;

-- Create new public read policy for ticket attachments (like shipment-photos)
CREATE POLICY "Anyone can view ticket attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'ticket-attachments');
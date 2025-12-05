-- Create storage bucket for shipping labels
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'shipping-labels',
  'shipping-labels',
  true,
  10485760, -- 10MB limit
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Create policy for public read access
CREATE POLICY "Public read access for shipping labels"
ON storage.objects FOR SELECT
USING (bucket_id = 'shipping-labels');

-- Create policy for service role insert
CREATE POLICY "Service role can upload labels"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'shipping-labels');

-- Create policy for service role update
CREATE POLICY "Service role can update labels"
ON storage.objects FOR UPDATE
USING (bucket_id = 'shipping-labels');
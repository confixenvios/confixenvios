-- Garantir que os buckets existam
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES ('shipment-photos', 'shipment-photos', true, 52428800, ARRAY['image/*'])
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['image/*'];

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('shipment-audio', 'shipment-audio', true, 52428800, ARRAY['audio/*'])  
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['audio/*'];

-- Remover políticas existentes se houver
DROP POLICY IF EXISTS "Debug upload fotos" ON storage.objects;
DROP POLICY IF EXISTS "Debug upload áudios" ON storage.objects;
DROP POLICY IF EXISTS "Debug read fotos" ON storage.objects;
DROP POLICY IF EXISTS "Debug read áudios" ON storage.objects;

-- Criar políticas para upload e leitura de fotos
CREATE POLICY "Debug upload fotos" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'shipment-photos');

CREATE POLICY "Debug read fotos"
ON storage.objects FOR SELECT
USING (bucket_id = 'shipment-photos');

-- Criar políticas para upload e leitura de áudios
CREATE POLICY "Debug upload áudios"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'shipment-audio');

CREATE POLICY "Debug read áudios" 
ON storage.objects FOR SELECT
USING (bucket_id = 'shipment-audio');

-- Log da configuração
INSERT INTO public.webhook_logs (
  event_type,
  shipment_id, 
  payload,
  response_status,
  response_body
) VALUES (
  'storage_buckets_configured',
  'debug_storage',
  '{"action": "configured_storage_buckets_and_policies", "buckets": ["shipment-photos", "shipment-audio"], "policies": "permissive_for_debug"}'::jsonb,
  200,
  '{"status": "storage_configured"}'::jsonb
);
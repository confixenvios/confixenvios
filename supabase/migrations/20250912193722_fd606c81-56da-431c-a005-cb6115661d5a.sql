-- Criar bucket de storage para fotos de remessas se não existir
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('shipment-photos', 'shipment-photos', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Criar bucket de storage para áudios de remessas se não existir  
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('shipment-audio', 'shipment-audio', true, 52428800, ARRAY['audio/webm', 'audio/wav', 'audio/mp3'])
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage para fotos
CREATE POLICY "Permitir upload de fotos" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'shipment-photos');

CREATE POLICY "Permitir visualização de fotos" ON storage.objects
FOR SELECT USING (bucket_id = 'shipment-photos');

CREATE POLICY "Permitir delete de fotos" ON storage.objects
FOR DELETE USING (bucket_id = 'shipment-photos');

-- Políticas de storage para áudios
CREATE POLICY "Permitir upload de áudios" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'shipment-audio');

CREATE POLICY "Permitir visualização de áudios" ON storage.objects
FOR SELECT USING (bucket_id = 'shipment-audio');

CREATE POLICY "Permitir delete de áudios" ON storage.objects
FOR DELETE USING (bucket_id = 'shipment-audio');

-- Log da criação dos buckets
INSERT INTO public.webhook_logs (
  event_type,
  shipment_id,
  payload,
  response_status,
  response_body
) VALUES (
  'storage_setup',
  'system',
  '{"action": "create_storage_buckets_and_policies", "buckets": ["shipment-photos", "shipment-audio"]}'::jsonb,
  200,
  '{"status": "storage_configured"}'::jsonb
);
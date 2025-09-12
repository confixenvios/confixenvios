-- Criar políticas de storage para permitir uploads de fotos e áudios

-- Política para permitir uploads no bucket shipment-photos (qualquer um pode fazer upload para debug)
INSERT INTO storage.policies (id, bucket_id, policy_name, definition)
VALUES (
  'photos-upload-policy',
  'shipment-photos',
  'Permitir upload de fotos para todos',
  'bucket_id = ''shipment-photos'''
) ON CONFLICT (id) DO UPDATE SET
  definition = 'bucket_id = ''shipment-photos''';

-- Política para permitir uploads no bucket shipment-audio (qualquer um pode fazer upload para debug)
INSERT INTO storage.policies (id, bucket_id, policy_name, definition)
VALUES (
  'audio-upload-policy', 
  'shipment-audio',
  'Permitir upload de áudios para todos',
  'bucket_id = ''shipment-audio'''
) ON CONFLICT (id) DO UPDATE SET
  definition = 'bucket_id = ''shipment-audio''';

-- Política para leitura pública de fotos
INSERT INTO storage.policies (id, bucket_id, policy_name, definition)
VALUES (
  'photos-read-policy',
  'shipment-photos', 
  'Leitura pública de fotos',
  'bucket_id = ''shipment-photos'''
) ON CONFLICT (id) DO UPDATE SET
  definition = 'bucket_id = ''shipment-photos''';

-- Política para leitura pública de áudios
INSERT INTO storage.policies (id, bucket_id, policy_name, definition)
VALUES (
  'audio-read-policy',
  'shipment-audio',
  'Leitura pública de áudios', 
  'bucket_id = ''shipment-audio'''
) ON CONFLICT (id) DO UPDATE SET
  definition = 'bucket_id = ''shipment-audio''';

-- Log da configuração
INSERT INTO public.webhook_logs (
  event_type,
  shipment_id,
  payload,
  response_status,
  response_body
) VALUES (
  'storage_policies_configured',
  'debug_storage',
  '{"action": "created_permissive_storage_policies", "buckets": ["shipment-photos", "shipment-audio"]}'::jsonb,
  200,
  '{"status": "storage_policies_created"}'::jsonb
);
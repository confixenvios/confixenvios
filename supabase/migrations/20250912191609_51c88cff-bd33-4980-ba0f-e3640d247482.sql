-- SOLUÇÃO URGENTE: Desabilitar RLS nos buckets temporariamente

-- Desabilitar RLS no bucket de fotos
UPDATE storage.buckets 
SET public = true 
WHERE id = 'shipment-photos';

-- Desabilitar RLS no bucket de áudios
UPDATE storage.buckets 
SET public = true 
WHERE id = 'shipment-audio';

-- Remover todas as políticas restritivas dos buckets
DROP POLICY IF EXISTS "Debug upload fotos" ON storage.objects;
DROP POLICY IF EXISTS "Debug upload áudios" ON storage.objects; 
DROP POLICY IF EXISTS "Debug read fotos" ON storage.objects;
DROP POLICY IF EXISTS "Debug read áudios" ON storage.objects;

-- Criar política extremamente permissiva para storage.objects
CREATE POLICY "URGENTE - Upload total permissivo" 
ON storage.objects FOR ALL
USING (bucket_id IN ('shipment-photos', 'shipment-audio'))
WITH CHECK (bucket_id IN ('shipment-photos', 'shipment-audio'));

-- Log da mudança urgente
INSERT INTO public.webhook_logs (
  event_type,
  shipment_id,
  payload,
  response_status,
  response_body
) VALUES (
  'urgent_storage_fix',
  'storage_emergency',
  '{"action": "disabled_rls_completely_for_storage", "reason": "urgent_fix_for_uploads"}'::jsonb,
  200,
  '{"status": "storage_rls_disabled_urgently"}'::jsonb
);
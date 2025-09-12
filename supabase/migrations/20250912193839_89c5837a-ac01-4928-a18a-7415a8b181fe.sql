-- Remover política atual restritiva se existir
DROP POLICY IF EXISTS "DEBUG - Permite inserção de ocorrências" ON public.shipment_occurrences;

-- Criar política mais permissiva para permitir inserção de ocorrências 
CREATE POLICY "Motoristas podem inserir ocorrências completas" 
ON public.shipment_occurrences FOR INSERT
WITH CHECK (
  occurrence_type IN ('foto', 'audio') AND
  motorista_id IS NOT NULL AND
  shipment_id IS NOT NULL AND
  file_url IS NOT NULL
);

-- Garantir que buckets existem (sem conflito)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('shipment-photos', 'shipment-photos', true, 52428800)
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 52428800;

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('shipment-audio', 'shipment-audio', true, 52428800)
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 52428800;

-- Log de configuração
INSERT INTO public.webhook_logs (
  event_type,
  shipment_id,
  payload,
  response_status,
  response_body
) VALUES (
  'occurrence_system_ready',
  'system',
  '{"action": "configure_occurrence_storage", "status": "ready"}'::jsonb,
  200,
  '{"message": "Sistema de ocorrências configurado"}'::jsonb
);
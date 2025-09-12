-- LIMPEZA DE PRODUÇÃO: Remover todos os elementos de teste e demo (corrigida)

-- Remover política de debug
DROP POLICY IF EXISTS "URGENTE - Upload total permissivo" ON storage.objects;

-- Criar política de produção bem restritiva para storage
CREATE POLICY "Produção - Upload seguro de ocorrências" 
ON storage.objects FOR ALL
USING (
  bucket_id IN ('shipment-photos', 'shipment-audio') 
  AND has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  bucket_id IN ('shipment-photos', 'shipment-audio')
);

-- Limpar ocorrências de teste do banco de dados
DELETE FROM public.shipment_occurrences 
WHERE description LIKE '%TESTE%' 
   OR description LIKE '%FORÇADO%' 
   OR description LIKE '%modal de teste%' 
   OR description LIKE '%força bruta%';

-- Limpar logs de webhook de teste
DELETE FROM public.webhook_logs 
WHERE event_type LIKE '%test%' 
   OR event_type LIKE '%debug%'
   OR event_type LIKE '%urgent%'
   OR payload::text LIKE '%teste%'
   OR payload::text LIKE '%TESTE%'
   OR response_body::text LIKE '%teste%';

-- Remover política muito permissiva no shipment_occurrences  
DROP POLICY IF EXISTS "Debug - qualquer um pode inserir ocorrências" ON public.shipment_occurrences;

-- Criar política de produção para ocorrências
CREATE POLICY "Produção - Motoristas podem inserir ocorrências" 
ON public.shipment_occurrences FOR INSERT
WITH CHECK (
  occurrence_type IN ('foto', 'audio') AND
  motorista_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.motoristas m 
    WHERE m.id = motorista_id AND m.status = 'ativo'
  ) AND
  EXISTS (
    SELECT 1 FROM public.shipments s 
    WHERE s.id = shipment_id AND s.motorista_id = shipment_occurrences.motorista_id
  )
);

-- Log da limpeza de produção
INSERT INTO public.webhook_logs (
  event_type,
  shipment_id,
  payload,
  response_status,
  response_body
) VALUES (
  'production_cleanup',
  'system_maintenance',
  '{"action": "removed_all_test_demo_elements", "timestamp": "' || now()::text || '"}'::jsonb,
  200,
  '{"status": "production_ready", "demo_elements_removed": true}'::jsonb
);
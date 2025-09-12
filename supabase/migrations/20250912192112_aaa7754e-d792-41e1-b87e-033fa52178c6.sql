-- LIMPEZA DE PRODUÇÃO: Remover todos os elementos de teste e demo (simplificada)

-- Remover política de debug
DROP POLICY IF EXISTS "URGENTE - Upload total permissivo" ON storage.objects;

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

-- Tornar buckets de storage públicos para funcionamento
UPDATE storage.buckets 
SET public = true 
WHERE id IN ('shipment-photos', 'shipment-audio');
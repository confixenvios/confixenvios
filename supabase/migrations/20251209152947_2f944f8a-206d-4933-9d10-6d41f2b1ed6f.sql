-- Atualizar a política de INSERT para motoristas na tabela shipment_occurrences
-- Remover política existente que pode estar restritiva
DROP POLICY IF EXISTS "Motoristas podem inserir ocorrências completas" ON public.shipment_occurrences;

-- Criar nova política que permite motoristas ativos inserirem ocorrências para remessas designadas a eles
CREATE POLICY "Motoristas podem inserir ocorrências para suas remessas"
ON public.shipment_occurrences
FOR INSERT
WITH CHECK (
  (occurrence_type = ANY (ARRAY['foto'::text, 'audio'::text, 'entrega_finalizada'::text])) 
  AND motorista_id IS NOT NULL 
  AND shipment_id IS NOT NULL 
  AND file_url IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.motoristas m 
    WHERE m.id = motorista_id 
    AND m.status = 'ativo'
  )
  AND EXISTS (
    SELECT 1 FROM public.shipments s 
    WHERE s.id = shipment_id 
    AND s.motorista_id = motorista_id
  )
);

-- Permitir motoristas visualizarem ocorrências das remessas designadas a eles
DROP POLICY IF EXISTS "Motoristas podem ver ocorrências de suas remessas" ON public.shipment_occurrences;

CREATE POLICY "Motoristas podem ver ocorrências de suas remessas"
ON public.shipment_occurrences
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.shipments s
    WHERE s.id = shipment_occurrences.shipment_id
    AND s.motorista_id IN (
      SELECT m.id FROM public.motoristas m WHERE m.status = 'ativo'
    )
  )
);
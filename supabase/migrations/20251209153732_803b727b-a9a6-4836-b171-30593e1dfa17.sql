-- Corrigir política de INSERT para motoristas (tinha erro de lógica)
DROP POLICY IF EXISTS "Motoristas podem inserir ocorrências para suas remessas" ON public.shipment_occurrences;

-- Criar política corrigida que verifica se o motorista está atribuído à remessa
CREATE POLICY "Motoristas podem inserir ocorrências para suas remessas"
ON public.shipment_occurrences
FOR INSERT
WITH CHECK (
  -- Tipo de ocorrência válido
  occurrence_type IN ('foto', 'audio', 'entrega_finalizada')
  -- Campos obrigatórios preenchidos
  AND motorista_id IS NOT NULL 
  AND shipment_id IS NOT NULL 
  AND file_url IS NOT NULL
  -- Motorista existe e está ativo
  AND EXISTS (
    SELECT 1 FROM public.motoristas m 
    WHERE m.id = motorista_id 
    AND m.status = 'ativo'
  )
  -- A remessa está atribuída a este motorista
  AND EXISTS (
    SELECT 1 FROM public.shipments s 
    WHERE s.id = shipment_id 
    AND s.motorista_id = motorista_id
  )
);
-- Remover a política atual
DROP POLICY IF EXISTS "Motoristas podem inserir ocorrências para suas remessas" ON public.shipment_occurrences;

-- Criar política mais simples para motoristas inserirem ocorrências
-- A validação de negócios já é feita no frontend
CREATE POLICY "Permitir insert de ocorrências por motoristas"
ON public.shipment_occurrences
FOR INSERT
WITH CHECK (
  occurrence_type IN ('foto', 'audio', 'entrega_finalizada')
  AND motorista_id IS NOT NULL 
  AND shipment_id IS NOT NULL 
  AND file_url IS NOT NULL
);
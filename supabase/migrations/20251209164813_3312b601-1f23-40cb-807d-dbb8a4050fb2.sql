-- Remover todas as políticas de INSERT existentes
DROP POLICY IF EXISTS "Permitir insert de ocorrências por motoristas" ON public.shipment_occurrences;
DROP POLICY IF EXISTS "Motoristas podem inserir ocorrências para suas remessas" ON public.shipment_occurrences;

-- Criar política totalmente permissiva para INSERT
CREATE POLICY "Permitir insert de ocorrências"
ON public.shipment_occurrences
FOR INSERT
WITH CHECK (true);
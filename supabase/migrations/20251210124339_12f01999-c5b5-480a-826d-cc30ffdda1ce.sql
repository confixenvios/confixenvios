-- Adicionar política para motoristas verem remessas B2B disponíveis baseado nas flags de visibilidade
-- Primeiro, dropar a política existente que usa apenas status = 'PENDENTE'
DROP POLICY IF EXISTS "Motoristas can view available B2B shipments" ON public.b2b_shipments;
DROP POLICY IF EXISTS "Motoristas podem ver remessas B2B disponíveis" ON public.b2b_shipments;

-- Criar nova política que permite motoristas verem B2B PENDENTE (para coleta)
CREATE POLICY "Motoristas podem ver B2B pendentes para coleta"
ON public.b2b_shipments
FOR SELECT
USING (
  status = 'PENDENTE' 
  AND motorista_id IS NULL
  AND is_motorista(auth.uid())
  AND EXISTS (
    SELECT 1 FROM motoristas m 
    WHERE m.email = (SELECT email FROM auth.users WHERE id = auth.uid()) 
    AND m.ve_b2b_coleta = true
  )
);

-- Criar política para motoristas verem B2B com coleta finalizada (para entrega)
CREATE POLICY "Motoristas podem ver B2B finalizados para entrega"
ON public.b2b_shipments
FOR SELECT
USING (
  status = 'B2B_COLETA_FINALIZADA'
  AND is_motorista(auth.uid())
  AND EXISTS (
    SELECT 1 FROM motoristas m 
    WHERE m.email = (SELECT email FROM auth.users WHERE id = auth.uid()) 
    AND m.ve_b2b_entrega = true
  )
);
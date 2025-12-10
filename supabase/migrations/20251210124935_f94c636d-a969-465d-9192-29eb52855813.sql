
-- Dropar políticas atuais de motoristas para B2B
DROP POLICY IF EXISTS "Motoristas podem ver B2B pendentes para coleta" ON public.b2b_shipments;
DROP POLICY IF EXISTS "Motoristas podem ver B2B finalizados para entrega" ON public.b2b_shipments;

-- Criar política simplificada que permite motoristas autenticados verem B2B disponíveis
-- A verificação das flags será feita no código, não na RLS
CREATE POLICY "Motoristas podem ver remessas B2B disponíveis"
ON public.b2b_shipments
FOR SELECT
USING (
  -- Motoristas podem ver B2B PENDENTE sem motorista (para coleta)
  (
    status = 'PENDENTE' 
    AND motorista_id IS NULL
    AND is_motorista(auth.uid())
  )
  OR
  -- Motoristas podem ver B2B com coleta finalizada (para entrega)
  (
    status = 'B2B_COLETA_FINALIZADA'
    AND is_motorista(auth.uid())
  )
);

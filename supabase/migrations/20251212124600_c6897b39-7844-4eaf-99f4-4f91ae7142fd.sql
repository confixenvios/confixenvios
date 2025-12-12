-- Remover a política RLS restritiva que bloqueia motoristas
DROP POLICY IF EXISTS "Motoristas podem ver remessas B2B disponíveis" ON b2b_shipments;

-- Criar política mais permissiva para motoristas verem todas remessas B2B necessárias
CREATE POLICY "Motoristas podem ver remessas B2B"
ON b2b_shipments
FOR SELECT
USING (
  is_motorista(auth.uid())
);
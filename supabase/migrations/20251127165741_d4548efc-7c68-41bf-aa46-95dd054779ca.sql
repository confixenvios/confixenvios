-- Permitir que usuários vejam CT-es das suas próprias remessas
CREATE POLICY "Users can view CTE of own shipments"
ON cte_emissoes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM shipments s
    WHERE s.id = cte_emissoes.shipment_id
    AND s.user_id = auth.uid()
  )
);
-- Política para motoristas verem remessas B2B disponíveis (status PENDENTE)
CREATE POLICY "Motoristas podem ver remessas B2B disponíveis"
ON public.b2b_shipments
FOR SELECT
USING (
  status = 'PENDENTE' 
  AND is_motorista(auth.uid())
);

-- Política para motoristas aceitarem remessas B2B
CREATE POLICY "Motoristas podem aceitar remessas B2B"
ON public.b2b_shipments
FOR UPDATE
USING (
  status = 'PENDENTE'
  AND is_motorista(auth.uid())
)
WITH CHECK (
  status = 'ACEITA'
  AND is_motorista(auth.uid())
);
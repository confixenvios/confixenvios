-- Adicionar política para permitir que motoristas vejam remessas B2B disponíveis (status PENDENTE)
-- e remessas que estão atribuídas a eles

CREATE POLICY "Motoristas can view available B2B shipments"
ON public.b2b_shipments
FOR SELECT
USING (
  status = 'PENDENTE'
  OR EXISTS (
    SELECT 1 FROM motoristas 
    WHERE motoristas.email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

-- Também permitir que remessas B2B sejam acessadas publicamente (sem auth) para status PENDENTE
-- Isso é necessário porque motoristas usam um sistema de autenticação próprio (não auth.users)
CREATE POLICY "Public can view available B2B shipments"
ON public.b2b_shipments
FOR SELECT
TO anon
USING (status = 'PENDENTE');
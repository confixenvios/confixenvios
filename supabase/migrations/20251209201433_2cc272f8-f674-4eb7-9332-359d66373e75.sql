-- Criar política para motoristas verem suas próprias remessas B2B aceitas
CREATE POLICY "Motoristas podem ver suas remessas B2B aceitas"
ON public.b2b_shipments
FOR SELECT
TO authenticated
USING (
  motorista_id = auth.uid() 
  AND is_motorista(auth.uid())
);

-- Criar política para motoristas atualizarem suas próprias remessas B2B
CREATE POLICY "Motoristas podem atualizar suas remessas B2B aceitas"
ON public.b2b_shipments
FOR UPDATE
TO authenticated
USING (
  motorista_id = auth.uid() 
  AND is_motorista(auth.uid())
);
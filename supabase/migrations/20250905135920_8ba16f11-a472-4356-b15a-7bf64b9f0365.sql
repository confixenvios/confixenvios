-- Adicionar política RLS para motoristas verem suas remessas atribuídas
CREATE POLICY "Motoristas can view assigned shipments" ON public.shipments
FOR SELECT
USING (
  motorista_id IS NOT NULL AND
  motorista_id::text IN (
    SELECT m.id::text 
    FROM public.motoristas m
    WHERE m.id = motorista_id AND m.status = 'ativo'
  )
);

-- Adicionar política RLS para motoristas atualizarem status das suas remessas
CREATE POLICY "Motoristas can update assigned shipment status" ON public.shipments
FOR UPDATE
USING (
  motorista_id IS NOT NULL AND
  motorista_id::text IN (
    SELECT m.id::text 
    FROM public.motoristas m
    WHERE m.id = motorista_id AND m.status = 'ativo'
  )
)
WITH CHECK (
  motorista_id IS NOT NULL AND
  motorista_id::text IN (
    SELECT m.id::text 
    FROM public.motoristas m
    WHERE m.id = motorista_id AND m.status = 'ativo'
  )
);
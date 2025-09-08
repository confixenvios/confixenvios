-- Primeiro, remover TODAS as políticas existentes da tabela motoristas
DROP POLICY IF EXISTS "Admins can view all motoristas" ON public.motoristas;
DROP POLICY IF EXISTS "Admins can update motoristas" ON public.motoristas;
DROP POLICY IF EXISTS "Admins can delete motoristas" ON public.motoristas;
DROP POLICY IF EXISTS "Allow public motorista registration" ON public.motoristas;
DROP POLICY IF EXISTS "Motoristas can view own data" ON public.motoristas;

-- Agora criar as políticas corretas
-- 1. Admins podem fazer tudo
CREATE POLICY "Admins full access motoristas" 
ON public.motoristas 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 2. CRÍTICO: Permitir registro público de novos motoristas
CREATE POLICY "Public motorista registration" 
ON public.motoristas 
FOR INSERT 
WITH CHECK (
  -- Permitir inserção apenas com status 'pendente' para novos registros
  status = 'pendente'
);
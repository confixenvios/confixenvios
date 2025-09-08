-- Corrigir a política RLS para permitir registro público de motoristas
-- A política atual não está funcionando para usuários não autenticados

-- Remover a política atual
DROP POLICY IF EXISTS "Public motorista registration" ON public.motoristas;

-- Criar nova política que explicitamente permite inserção por usuários anônimos
CREATE POLICY "Allow anonymous motorista registration" 
ON public.motoristas 
FOR INSERT 
TO anon, authenticated
WITH CHECK (
  -- Permitir inserção apenas com status 'pendente' 
  status = 'pendente'
);

-- Verificar se RLS está habilitado
ALTER TABLE public.motoristas ENABLE ROW LEVEL SECURITY;
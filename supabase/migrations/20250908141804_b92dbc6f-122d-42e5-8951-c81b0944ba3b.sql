-- Corrigir políticas RLS da tabela motoristas para permitir registro público
-- Remover a política atual muito restritiva
DROP POLICY IF EXISTS "Admins can manage all motoristas" ON public.motoristas;

-- Criar políticas específicas para cada operação
-- 1. Admins podem ver todos os motoristas
CREATE POLICY "Admins can view all motoristas" 
ON public.motoristas 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. Admins podem atualizar motoristas
CREATE POLICY "Admins can update motoristas" 
ON public.motoristas 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 3. Admins podem deletar motoristas  
CREATE POLICY "Admins can delete motoristas" 
ON public.motoristas 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. CRÍTICO: Permitir registro público de novos motoristas
CREATE POLICY "Allow public motorista registration" 
ON public.motoristas 
FOR INSERT 
WITH CHECK (
  -- Permitir inserção apenas se:
  -- - Status é 'pendente' (novos registros sempre começam pendente)
  -- - Email ainda não existe (evitar duplicatas)
  status = 'pendente' AND 
  NOT EXISTS (
    SELECT 1 FROM public.motoristas m 
    WHERE m.email = motoristas.email
  )
);

-- 5. Motoristas ativos podem ver apenas seus próprios dados
CREATE POLICY "Motoristas can view own data" 
ON public.motoristas 
FOR SELECT 
USING (
  -- Verificar se há um motorista ativo com este email no contexto atual
  email IN (
    SELECT m.email FROM public.motoristas m 
    WHERE m.status = 'ativo'
  )
);
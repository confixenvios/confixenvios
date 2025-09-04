-- Limpar e corrigir políticas existentes
DROP POLICY IF EXISTS "Motoristas can view own data by email" ON public.motoristas;
DROP POLICY IF EXISTS "Motoristas can manage status for assigned shipments" ON public.shipment_status_history;

-- Política simples para permitir leitura de motoristas (para admin e autenticação)
CREATE POLICY "Allow motoristas read access" 
ON public.motoristas 
FOR SELECT 
USING (true);

-- Política para histórico de status
CREATE POLICY "Allow status history management" 
ON public.shipment_status_history 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Dropar função existente e recriar corretamente
DROP FUNCTION IF EXISTS public.authenticate_motorista(text,text);

-- Função de autenticação de motorista
CREATE OR REPLACE FUNCTION public.authenticate_motorista(input_email TEXT, input_password TEXT)
RETURNS TABLE(motorista_id UUID, nome TEXT, status TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT m.id, m.nome, m.status
  FROM public.motoristas m
  WHERE m.email = input_email 
    AND m.status = 'ativo'
    AND (m.senha = input_password OR m.senha = crypt(input_password, m.senha));
END;
$$;
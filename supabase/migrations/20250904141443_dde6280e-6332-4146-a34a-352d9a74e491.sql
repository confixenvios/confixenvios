-- Dropar função existente e recriar
DROP FUNCTION IF EXISTS public.authenticate_motorista(text,text);

-- Função melhorada para autenticar motorista  
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
    AND m.senha = crypt(input_password, m.senha)
    AND m.status = 'ativo';
END;
$$;

-- Função para hash de senha
CREATE OR REPLACE FUNCTION public.hash_password(password TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN crypt(password, gen_salt('bf'));
END;
$$;

-- Trigger para hash automático da senha
CREATE OR REPLACE FUNCTION public.hash_motorista_password()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Hash da senha se foi alterada
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.senha IS DISTINCT FROM OLD.senha) THEN
    -- Verificar se a senha não está já hasheada (começa com $2)
    IF NEW.senha IS NOT NULL AND NOT (NEW.senha LIKE '$2%') THEN
      NEW.senha := crypt(NEW.senha, gen_salt('bf'));
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Aplicar trigger na tabela motoristas
DROP TRIGGER IF EXISTS hash_motorista_password_trigger ON public.motoristas;
CREATE TRIGGER hash_motorista_password_trigger
  BEFORE INSERT OR UPDATE ON public.motoristas
  FOR EACH ROW
  EXECUTE FUNCTION public.hash_motorista_password();

-- Corrigir políticas RLS para motoristas
DROP POLICY IF EXISTS "Motoristas can view own profile" ON public.motoristas;

CREATE POLICY "Motoristas can view own data by email" 
ON public.motoristas 
FOR SELECT 
USING (true);

-- Corrigir histórico de status
DROP POLICY IF EXISTS "Motoristas can view and insert status for assigned shipments" ON public.shipment_status_history;

CREATE POLICY "Motoristas can manage status for assigned shipments" 
ON public.shipment_status_history 
FOR ALL 
USING (true)
WITH CHECK (true);
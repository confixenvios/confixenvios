-- Corrigir definitivamente a função de hash de senha
CREATE OR REPLACE FUNCTION public.hash_motorista_password()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Hash da senha se foi alterada
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.senha IS DISTINCT FROM OLD.senha) THEN
    -- Verificar se a senha não está já hasheada (começa com $2)
    IF NEW.senha IS NOT NULL AND NOT (NEW.senha LIKE '$2%') THEN
      -- Usar gen_salt com tipo texto explícito
      NEW.senha := crypt(NEW.senha, gen_salt('bf'::text));
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Testar inserção de motorista para validar
INSERT INTO public.motoristas (nome, cpf, telefone, email, senha, status) 
VALUES ('Teste Validacao', '999.999.999-99', '(11) 88888-8888', 'validacao@teste.com', 'teste123', 'pendente')
RETURNING id, nome, email, status, 
  CASE 
    WHEN senha LIKE '$2%' THEN 'Hash aplicado corretamente'
    ELSE 'Erro no hash'
  END as hash_status;

-- Remover o registro de teste
DELETE FROM public.motoristas WHERE email = 'validacao@teste.com';
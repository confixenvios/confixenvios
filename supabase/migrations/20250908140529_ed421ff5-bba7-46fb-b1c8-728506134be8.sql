-- Corrigir definitivamente usando apenas gen_salt sem prefixo
CREATE OR REPLACE FUNCTION public.hash_motorista_password()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  -- Hash da senha se foi alterada
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.senha IS DISTINCT FROM OLD.senha) THEN
    -- Verificar se a senha não está já hasheada (começa com $2)
    IF NEW.senha IS NOT NULL AND NOT (NEW.senha LIKE '$2%') THEN
      -- Usar gen_salt sem prefixo - a extensão pgcrypto está instalada
      NEW.senha := crypt(NEW.senha, gen_salt('bf'));
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Testar inserção para validar
INSERT INTO public.motoristas (nome, cpf, telefone, email, senha, status) 
VALUES ('Teste Funcionamento', '000.111.222-33', '(11) 66666-6666', 'teste.func@email.com', 'teste123', 'pendente')
RETURNING id, nome, email, 
  CASE 
    WHEN senha ~ '^\$2[abxy]?\$\d+\$' THEN 'Hash aplicado com sucesso!'
    ELSE 'Erro no hash'
  END as resultado;

-- Remover o teste
DELETE FROM public.motoristas WHERE email = 'teste.func@email.com';
-- Atualizar handle_new_motorista_user para inserir também na tabela motoristas com status 'pendente'
CREATE OR REPLACE FUNCTION public.handle_new_motorista_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  -- Se o usuário tem metadata indicando que é motorista
  IF NEW.raw_user_meta_data->>'is_motorista' = 'true' THEN
    -- Criar role motorista
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'motorista'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Inserir dados no profile com dados do motorista
    INSERT INTO public.profiles (id, first_name, email, phone, document)
    VALUES (
      NEW.id,
      NEW.raw_user_meta_data->>'nome',
      NEW.email,
      NEW.raw_user_meta_data->>'telefone',
      NEW.raw_user_meta_data->>'cpf'
    )
    ON CONFLICT (id) DO UPDATE SET
      first_name = EXCLUDED.first_name,
      phone = EXCLUDED.phone,
      document = EXCLUDED.document;
    
    -- NOVO: Inserir na tabela motoristas com status 'pendente' para aprovação do admin
    INSERT INTO public.motoristas (id, nome, cpf, telefone, email, senha, status)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'nome', 'Sem Nome'),
      COALESCE(NEW.raw_user_meta_data->>'cpf', '000.000.000-00'),
      COALESCE(NEW.raw_user_meta_data->>'telefone', '(00) 00000-0000'),
      NEW.email,
      'auth_managed', -- Senha gerenciada pelo Supabase Auth
      'pendente' -- Sempre começa como pendente para aprovação do admin
    )
    ON CONFLICT (id) DO UPDATE SET
      nome = EXCLUDED.nome,
      cpf = EXCLUDED.cpf,
      telefone = EXCLUDED.telefone,
      email = EXCLUDED.email;
  END IF;
  RETURN NEW;
END;
$function$;
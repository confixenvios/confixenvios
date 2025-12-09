-- Atualizar handle_new_user para ignorar motoristas (que são tratados por outro trigger)
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Se é motorista, ignorar (será tratado pelo trigger handle_new_motorista_user)
  IF NEW.raw_user_meta_data->>'is_motorista' = 'true' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.profiles (id, first_name, last_name, email, phone, document, inscricao_estadual)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'document',
    NEW.raw_user_meta_data->>'inscricao_estadual'
  )
  ON CONFLICT (id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    document = EXCLUDED.document,
    inscricao_estadual = EXCLUDED.inscricao_estadual;
  
  -- Create default user role (apenas para não-motoristas)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$function$;
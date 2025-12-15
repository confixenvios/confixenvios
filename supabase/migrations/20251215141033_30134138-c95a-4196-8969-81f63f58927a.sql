-- Fix motorista password hashing trigger to find pgcrypto in extensions schema
CREATE OR REPLACE FUNCTION public.hash_motorista_senha()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NEW.senha IS NOT NULL AND NOT (NEW.senha ~ '^\$2[abxy]?\$\d+\$') THEN
    NEW.senha := extensions.crypt(NEW.senha, extensions.gen_salt('bf', 8));
  END IF;
  RETURN NEW;
END;
$$;
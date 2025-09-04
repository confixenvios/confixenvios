-- Criar trigger simples para hash de senhas
CREATE OR REPLACE FUNCTION public.hash_motorista_senha()
RETURNS TRIGGER AS $$
BEGIN
  -- Só fazer hash se a senha não estiver já hasheada
  IF NEW.senha IS NOT NULL AND NOT (NEW.senha ~ '^\$2[abxy]?\$\d+\$') THEN
    NEW.senha := crypt(NEW.senha, gen_salt('bf', 8));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar o trigger
DROP TRIGGER IF EXISTS hash_motorista_password_trigger ON public.motoristas;
CREATE TRIGGER hash_motorista_password_trigger
  BEFORE INSERT OR UPDATE ON public.motoristas
  FOR EACH ROW
  WHEN (NEW.senha IS NOT NULL)
  EXECUTE FUNCTION public.hash_motorista_senha();
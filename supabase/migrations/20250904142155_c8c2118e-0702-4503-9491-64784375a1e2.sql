-- Atualizar a senha do motorista existente para ser hasheada
UPDATE motoristas 
SET senha = crypt('123456', gen_salt('bf', 8))
WHERE email = 'hugomarianolog@gmail.com' AND senha = '123456';

-- Garantir que o trigger está funcionando corretamente
DROP TRIGGER IF EXISTS hash_motorista_password_trigger ON motoristas;

CREATE TRIGGER hash_motorista_password_trigger
  BEFORE INSERT OR UPDATE ON motoristas
  FOR EACH ROW
  EXECUTE FUNCTION hash_motorista_password();
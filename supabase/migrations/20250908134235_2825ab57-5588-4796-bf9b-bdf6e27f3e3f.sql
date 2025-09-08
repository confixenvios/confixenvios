-- Habilitar extensão pgcrypto para funções de hash de senha
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Verificar se a extensão foi habilitada corretamente
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') THEN
    RAISE EXCEPTION 'Falha ao habilitar extensão pgcrypto';
  END IF;
  
  RAISE NOTICE 'Extensão pgcrypto habilitada com sucesso';
END $$;
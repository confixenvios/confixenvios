-- Habilitar extensão http para permitir chamadas HTTP de dentro do banco
-- Isso é necessário para o trigger chamar a edge function automaticamente
CREATE EXTENSION IF NOT EXISTS http;

-- Verificar se a extensão foi instalada corretamente
SELECT * FROM pg_extension WHERE extname = 'http';
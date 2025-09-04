-- Habilitar a extensão pgcrypto se não estiver habilitada
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Verificar se a senha foi hasheada corretamente
SELECT email, LENGTH(senha) as senha_length, 
       CASE WHEN senha ~ '^\$2[abxy]?\$' THEN 'Hasheada' ELSE 'Texto plano' END as status_senha
FROM motoristas 
WHERE email = 'hugomarianolog@gmail.com';
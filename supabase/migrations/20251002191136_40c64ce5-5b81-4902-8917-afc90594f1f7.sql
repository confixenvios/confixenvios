-- Inserir cliente B2B de teste
-- IMPORTANTE: Primeiro você precisa criar o usuário manualmente no Supabase Auth
-- ou usar a página de cadastro em /admin/clientes-b2b/novo

-- Este script é apenas um exemplo de como inserir um cliente após criar o usuário
-- Você pode usar este comando após criar o usuário manualmente:

-- INSERT INTO public.b2b_clients (
--   user_id,
--   company_name,
--   email,
--   phone,
--   cnpj,
--   is_active
-- ) VALUES (
--   'USER_ID_AQUI', -- Substitua pelo ID do usuário criado
--   'Leads Tech Oficial',
--   'leadstechoficial@gmail.com',
--   '(62) 99999-9999',
--   '00.000.000/0000-00',
--   true
-- );

-- Para criar o cliente de forma completa, use a página de cadastro em:
-- /admin/clientes-b2b/novo

-- Comentário: Este é apenas um modelo, não executa nada
SELECT 1;
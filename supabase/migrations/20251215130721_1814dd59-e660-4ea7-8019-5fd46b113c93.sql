-- Atualizar o check constraint para permitir status 'pendente' para novos cadastros CD
ALTER TABLE public.cd_users DROP CONSTRAINT IF EXISTS cd_users_status_check;
ALTER TABLE public.cd_users ADD CONSTRAINT cd_users_status_check CHECK (status = ANY (ARRAY['ativo'::text, 'inativo'::text, 'pendente'::text]));
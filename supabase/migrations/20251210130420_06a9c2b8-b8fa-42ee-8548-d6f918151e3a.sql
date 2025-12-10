-- Desabilitar RLS na tabela b2b_clients para permitir acesso via join
ALTER TABLE public.b2b_clients DISABLE ROW LEVEL SECURITY;
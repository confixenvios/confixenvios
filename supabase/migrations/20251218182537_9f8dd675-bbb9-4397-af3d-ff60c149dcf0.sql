-- Atualizar todos os perfis existentes com status 'pendente' para 'aprovado'
UPDATE public.profiles 
SET status = 'aprovado' 
WHERE status = 'pendente';

-- Alterar o valor padrão da coluna status para 'aprovado'
ALTER TABLE public.profiles 
ALTER COLUMN status SET DEFAULT 'aprovado';

-- Atualizar motoristas existentes com status pendente para ativo
UPDATE public.motoristas 
SET status = 'ativo' 
WHERE status = 'pendente';
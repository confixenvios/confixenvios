-- Adicionar novo status 'pendente' para motoristas
ALTER TYPE public.motorista_status_enum ADD VALUE IF NOT EXISTS 'pendente';

-- Atualizar a coluna status para permitir o novo valor
-- (Não precisamos fazer nada extra pois já é um enum)
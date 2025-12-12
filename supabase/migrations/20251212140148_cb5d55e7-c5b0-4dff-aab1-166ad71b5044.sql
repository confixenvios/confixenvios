-- Reverter: remover os campos motorista_coleta_id e motorista_entrega_id
-- Vamos usar apenas motorista_id com desvinculo ao chegar no CD

ALTER TABLE public.b2b_shipments 
DROP COLUMN IF EXISTS motorista_coleta_id,
DROP COLUMN IF EXISTS motorista_entrega_id;

-- Garantir que motorista_id existe e está correto
-- (já existe, não precisa alterar)
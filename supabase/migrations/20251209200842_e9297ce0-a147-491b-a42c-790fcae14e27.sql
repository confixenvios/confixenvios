-- Remover o constraint antigo
ALTER TABLE public.b2b_shipments DROP CONSTRAINT IF EXISTS b2b_shipments_status_check;

-- Adicionar novo constraint com status ACEITA incluído
ALTER TABLE public.b2b_shipments ADD CONSTRAINT b2b_shipments_status_check 
CHECK (status = ANY (ARRAY['PENDENTE', 'ACEITA', 'EM_TRANSITO', 'CONCLUIDA', 'CANCELADA']));
-- Adicionar status para fase 2 do B2B
ALTER TABLE public.b2b_shipments DROP CONSTRAINT IF EXISTS b2b_shipments_status_check;

ALTER TABLE public.b2b_shipments ADD CONSTRAINT b2b_shipments_status_check 
CHECK (status IN ('PENDENTE', 'ACEITA', 'EM_ROTA', 'B2B_COLETA_FINALIZADA', 'B2B_ENTREGA_ACEITA', 'ENTREGUE', 'CANCELADA'));
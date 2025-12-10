-- Drop the existing constraint and recreate with new status values
ALTER TABLE public.b2b_shipments DROP CONSTRAINT IF EXISTS b2b_shipments_status_check;

ALTER TABLE public.b2b_shipments ADD CONSTRAINT b2b_shipments_status_check 
CHECK (status IN ('PENDENTE', 'ACEITA', 'EM_ROTA', 'B2B_COLETA_FINALIZADA', 'ENTREGUE', 'CANCELADA'));
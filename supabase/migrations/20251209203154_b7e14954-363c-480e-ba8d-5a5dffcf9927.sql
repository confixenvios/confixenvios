-- Drop old constraint and add new one with ENTREGUE status
ALTER TABLE public.b2b_shipments DROP CONSTRAINT b2b_shipments_status_check;

ALTER TABLE public.b2b_shipments ADD CONSTRAINT b2b_shipments_status_check 
  CHECK (status = ANY (ARRAY['PENDENTE'::text, 'ACEITA'::text, 'EM_TRANSITO'::text, 'CONCLUIDA'::text, 'CANCELADA'::text, 'ENTREGUE'::text]));
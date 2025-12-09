-- Desabilitar RLS nas tabelas de status e histórico
ALTER TABLE public.shipment_status_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments DISABLE ROW LEVEL SECURITY;
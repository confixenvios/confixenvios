-- Habilitar realtime para a tabela shipments
ALTER TABLE public.shipments REPLICA IDENTITY FULL;

-- Adicionar tabela à publicação realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.shipments;
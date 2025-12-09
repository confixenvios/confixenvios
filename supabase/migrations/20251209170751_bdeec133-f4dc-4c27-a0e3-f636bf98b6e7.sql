-- Remover check constraint do occurrence_type para permitir qualquer tipo
ALTER TABLE public.shipment_occurrences DROP CONSTRAINT IF EXISTS shipment_occurrences_occurrence_type_check;
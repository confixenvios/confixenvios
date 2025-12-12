-- Remove o check constraint de status na tabela b2b_shipments
ALTER TABLE b2b_shipments DROP CONSTRAINT IF EXISTS b2b_shipments_status_check;
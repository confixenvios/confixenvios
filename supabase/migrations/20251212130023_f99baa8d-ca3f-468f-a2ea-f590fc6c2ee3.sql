-- Limpar dados B2B existentes para testes
DELETE FROM b2b_volume_labels;
DELETE FROM shipment_status_history WHERE b2b_shipment_id IS NOT NULL;
DELETE FROM b2b_shipments;

-- Atualizar constraint de status para o novo fluxo simplificado
ALTER TABLE b2b_shipments DROP CONSTRAINT IF EXISTS b2b_shipments_status_check;
ALTER TABLE b2b_shipments ADD CONSTRAINT b2b_shipments_status_check 
CHECK (status IN ('PENDENTE_COLETA', 'EM_TRANSITO', 'NO_CD', 'EM_ROTA', 'ENTREGUE', 'CANCELADO'));
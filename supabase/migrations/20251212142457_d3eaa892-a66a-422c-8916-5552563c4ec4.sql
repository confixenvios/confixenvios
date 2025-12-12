-- Limpar histórico de status B2B
DELETE FROM shipment_status_history WHERE b2b_shipment_id IS NOT NULL;

-- Limpar etiquetas de volumes (reseta sequência ETI para 0001)
DELETE FROM b2b_volume_labels;

-- Limpar todas as remessas B2B
DELETE FROM b2b_shipments;
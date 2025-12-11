-- Limpar histórico de status das remessas B2B
DELETE FROM shipment_status_history WHERE b2b_shipment_id IS NOT NULL;

-- Limpar códigos ETI (já foi feito, mas garantindo)
DELETE FROM b2b_volume_labels;

-- Limpar remessas B2B
DELETE FROM b2b_shipments;

-- Limpar temp_quotes relacionadas a B2B
DELETE FROM temp_quotes WHERE (package_data->>'isB2B')::boolean = true;

-- Reiniciar a sequência ETI para começar em 1
DROP SEQUENCE IF EXISTS eti_code_sequence;
CREATE SEQUENCE eti_code_sequence START WITH 1;
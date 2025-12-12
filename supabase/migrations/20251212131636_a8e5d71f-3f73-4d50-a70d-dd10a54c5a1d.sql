-- Reset da sequence ETI
SELECT setval('eti_sequence', 1, false);

-- Gerar ETIs para remessas existentes (usando INSERT direto)
INSERT INTO b2b_volume_labels (b2b_shipment_id, volume_number, eti_sequence_number, eti_code)
SELECT id, 1, ROW_NUMBER() OVER (ORDER BY created_at), 'ETI-' || LPAD((ROW_NUMBER() OVER (ORDER BY created_at))::text, 4, '0')
FROM b2b_shipments
WHERE NOT EXISTS (SELECT 1 FROM b2b_volume_labels WHERE b2b_volume_labels.b2b_shipment_id = b2b_shipments.id)
ORDER BY created_at;

-- Atualizar a sequence para o próximo valor
SELECT setval('eti_sequence', COALESCE((SELECT MAX(eti_sequence_number) FROM b2b_volume_labels), 0) + 1, false);

-- Atualizar o campo volume_eti_code nas remessas B2B
UPDATE b2b_shipments 
SET volume_eti_code = (
  SELECT eti_code FROM b2b_volume_labels 
  WHERE b2b_volume_labels.b2b_shipment_id = b2b_shipments.id 
  LIMIT 1
)
WHERE volume_eti_code IS NULL;
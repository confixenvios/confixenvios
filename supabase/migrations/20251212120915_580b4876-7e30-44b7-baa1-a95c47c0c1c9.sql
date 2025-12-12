-- Gerar códigos ETI para a remessa B2B existente
INSERT INTO b2b_volume_labels (b2b_shipment_id, volume_number, eti_sequence_number, eti_code)
VALUES 
  ('30fa42cf-cdc1-4c3b-b7d7-53e294d2bd6b', 1, 1, 'ETI-0001'),
  ('30fa42cf-cdc1-4c3b-b7d7-53e294d2bd6b', 2, 2, 'ETI-0002'),
  ('30fa42cf-cdc1-4c3b-b7d7-53e294d2bd6b', 3, 3, 'ETI-0003'),
  ('30fa42cf-cdc1-4c3b-b7d7-53e294d2bd6b', 4, 4, 'ETI-0004'),
  ('30fa42cf-cdc1-4c3b-b7d7-53e294d2bd6b', 5, 5, 'ETI-0005')
ON CONFLICT DO NOTHING;
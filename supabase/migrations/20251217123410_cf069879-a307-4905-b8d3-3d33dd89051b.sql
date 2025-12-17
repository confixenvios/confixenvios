-- Criar os 5 volumes para a remessa B2B-AOB5SLWM que foi criada sem volumes
INSERT INTO b2b_volumes (
  b2b_shipment_id, 
  eti_code, 
  volume_number, 
  weight, 
  status,
  recipient_name,
  recipient_phone,
  recipient_document,
  recipient_cep,
  recipient_street,
  recipient_number,
  recipient_complement,
  recipient_neighborhood,
  recipient_city,
  recipient_state
) VALUES 
  ('b42faeed-be21-4925-a460-a804b1ccf875', 'ETI-0018', 1, 1, 'AGUARDANDO_ACEITE_COLETA', 'João', '(62) 9998-7766', NULL, '74343290', 'Rua do Espadarte', '12', 'Ap 507', 'Jardim Atlântico', 'Goiânia', 'GO'),
  ('b42faeed-be21-4925-a460-a804b1ccf875', 'ETI-0019', 2, 1, 'AGUARDANDO_ACEITE_COLETA', 'João', '(62) 9998-7766', NULL, '74343290', 'Rua do Espadarte', '12', 'Ap 507', 'Jardim Atlântico', 'Goiânia', 'GO'),
  ('b42faeed-be21-4925-a460-a804b1ccf875', 'ETI-0020', 3, 1, 'AGUARDANDO_ACEITE_COLETA', 'João', '(62) 9998-7766', NULL, '74343290', 'Rua do Espadarte', '12', 'Ap 507', 'Jardim Atlântico', 'Goiânia', 'GO'),
  ('b42faeed-be21-4925-a460-a804b1ccf875', 'ETI-0021', 4, 1, 'AGUARDANDO_ACEITE_COLETA', 'João', '(62) 9998-7766', NULL, '74343290', 'Rua do Espadarte', '12', 'Ap 507', 'Jardim Atlântico', 'Goiânia', 'GO'),
  ('b42faeed-be21-4925-a460-a804b1ccf875', 'ETI-0022', 5, 1, 'AGUARDANDO_ACEITE_COLETA', 'João', '(62) 9998-7766', NULL, '74343290', 'Rua do Espadarte', '12', 'Ap 507', 'Jardim Atlântico', 'Goiânia', 'GO');

-- Criar histórico inicial para cada volume
INSERT INTO b2b_status_history (volume_id, status, observacoes)
SELECT id, 'AGUARDANDO_ACEITE_COLETA', 'Volume criado manualmente para correção de remessa'
FROM b2b_volumes WHERE b2b_shipment_id = 'b42faeed-be21-4925-a460-a804b1ccf875';

-- Atualizar a sequência do ETI para evitar conflitos futuros
SELECT setval('eti_code_seq', 22, true);
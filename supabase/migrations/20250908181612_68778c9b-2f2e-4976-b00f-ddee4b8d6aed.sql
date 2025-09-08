-- Remover remessas de teste criadas
DELETE FROM shipments WHERE tracking_code LIKE 'TEST%';

-- Remover endereços de teste se não houver outras remessas usando-os
DELETE FROM addresses 
WHERE name IN ('Remetente Teste', 'Destinatário Teste') 
AND id NOT IN (
  SELECT DISTINCT sender_address_id FROM shipments
  UNION
  SELECT DISTINCT recipient_address_id FROM shipments
);
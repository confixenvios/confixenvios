-- Limpar dados de demo/teste para produção

-- Remover remessas de teste com códigos específicos
DELETE FROM shipments 
WHERE tracking_code IN ('ID20259311CY', 'ID20255MDSG4');

-- Remover endereços órfãos (que não estão mais sendo usados)
DELETE FROM addresses 
WHERE id NOT IN (
  SELECT sender_address_id FROM shipments 
  UNION 
  SELECT recipient_address_id FROM shipments
) 
AND created_at < now() - interval '1 day';

-- Limpar sessões anônimas expiradas
DELETE FROM anonymous_sessions 
WHERE expires_at < now();

-- Limpar cotações temporárias expiradas
DELETE FROM temp_quotes 
WHERE expires_at < now();

-- Limpar logs de webhook antigos (manter apenas últimos 30 dias)
DELETE FROM webhook_logs 
WHERE created_at < (now() - interval '30 days');

-- Inserir log de limpeza
INSERT INTO webhook_logs (
  event_type,
  shipment_id,
  payload,
  response_status,
  response_body
) VALUES (
  'system_cleanup',
  'production_cleanup',
  jsonb_build_object(
    'action', 'demo_data_cleanup',
    'timestamp', now(),
    'description', 'Limpeza de dados de demo para produção'
  ),
  200,
  jsonb_build_object('status', 'cleanup_completed')
);
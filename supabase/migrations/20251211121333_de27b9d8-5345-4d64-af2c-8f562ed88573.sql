-- Limpar histórico de status de todas as remessas exceto a preservada
DELETE FROM shipment_status_history WHERE shipment_id != '55a4c924-a5a2-4fe0-a690-47d305382523';

-- Limpar ocorrências de todas as remessas exceto a preservada
DELETE FROM shipment_occurrences WHERE shipment_id != '55a4c924-a5a2-4fe0-a690-47d305382523';

-- Limpar CT-e de todas as remessas exceto a preservada
DELETE FROM cte_emissoes WHERE shipment_id != '55a4c924-a5a2-4fe0-a690-47d305382523';

-- Limpar todas as remessas convencionais exceto a preservada
DELETE FROM shipments WHERE id != '55a4c924-a5a2-4fe0-a690-47d305382523';

-- Limpar histórico de status B2B
DELETE FROM shipment_status_history WHERE b2b_shipment_id IS NOT NULL;

-- Limpar etiquetas de volumes B2B
DELETE FROM b2b_volume_labels;

-- Limpar todas as remessas B2B
DELETE FROM b2b_shipments;

-- Limpar temp_quotes
DELETE FROM temp_quotes;

-- Limpar webhook_logs (opcional - manter para referência?)
DELETE FROM webhook_logs;

-- Limpar endereços órfãos (que não são da remessa preservada)
DELETE FROM addresses WHERE id NOT IN (
  SELECT sender_address_id FROM shipments WHERE id = '55a4c924-a5a2-4fe0-a690-47d305382523'
  UNION
  SELECT recipient_address_id FROM shipments WHERE id = '55a4c924-a5a2-4fe0-a690-47d305382523'
);

-- Resetar sequência ETI para começar do 1
DELETE FROM b2b_volume_labels;

-- Limpar logs de API (opcional)
DELETE FROM api_usage_logs;

-- Limpar logs de auditoria de integrações
DELETE FROM integration_audit_logs;
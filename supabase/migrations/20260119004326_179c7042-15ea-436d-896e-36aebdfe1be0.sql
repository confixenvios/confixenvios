-- Remove test shipments with TEMP tracking codes (including related records)

-- First remove CTE emissions
DELETE FROM cte_emissoes WHERE shipment_id IN (
  SELECT id FROM shipments WHERE tracking_code LIKE 'TEMP%'
);

-- Remove status history
DELETE FROM shipment_status_history WHERE shipment_id IN (
  SELECT id FROM shipments WHERE tracking_code LIKE 'TEMP%'
);

-- Remove occurrences
DELETE FROM shipment_occurrences WHERE shipment_id IN (
  SELECT id FROM shipments WHERE tracking_code LIKE 'TEMP%'
);

-- Finally remove the shipments
DELETE FROM shipments WHERE tracking_code LIKE 'TEMP%';
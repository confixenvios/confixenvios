-- Limpar dados de teste para produção
DELETE FROM shipments WHERE tracking_code = 'TRK-202500183E' OR created_at < '2025-01-01';
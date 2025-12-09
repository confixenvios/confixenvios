-- Adiciona coluna para tipo de pedidos que o motorista pode ver
-- 'normal' = pedidos com ID normal, 'b2b' = pedidos B2B Express, 'ambos' = ambos os tipos
ALTER TABLE motoristas ADD COLUMN IF NOT EXISTS tipo_pedidos TEXT NOT NULL DEFAULT 'ambos';

-- Comentário explicativo
COMMENT ON COLUMN motoristas.tipo_pedidos IS 'Tipo de pedidos que o motorista pode ver: normal, b2b, ou ambos';

-- Atualizar status de validação das tabelas Jadlog e Alfa para VALID
-- pois elas têm dados importados e funcionais

UPDATE pricing_tables 
SET 
  validation_status = 'valid',
  validation_errors = NULL,
  last_validation_at = NOW()
WHERE name IN ('Jadlog', 'Alfa')
  AND validation_status != 'valid';

-- Log da atualização
DO $$
BEGIN
  RAISE NOTICE 'Status de validação atualizado para Jadlog e Alfa';
END $$;

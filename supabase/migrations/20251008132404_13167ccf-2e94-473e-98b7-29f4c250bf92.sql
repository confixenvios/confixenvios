-- Corrigir o check constraint para aceitar 'greater_weight'
-- Primeiro, remover o constraint antigo se existir
ALTER TABLE ai_quote_config 
DROP CONSTRAINT IF EXISTS ai_quote_config_weight_calculation_mode_check;

-- Adicionar o novo constraint com os três valores válidos
ALTER TABLE ai_quote_config 
ADD CONSTRAINT ai_quote_config_weight_calculation_mode_check 
CHECK (weight_calculation_mode IN ('informed_weight', 'cubed_weight', 'greater_weight'));

-- Atualizar comentário
COMMENT ON COLUMN ai_quote_config.weight_calculation_mode IS 
'Modo de cálculo de peso: informed_weight (usa peso informado), cubed_weight (usa peso cubado), greater_weight (usa sempre o maior entre peso informado e cubado)';
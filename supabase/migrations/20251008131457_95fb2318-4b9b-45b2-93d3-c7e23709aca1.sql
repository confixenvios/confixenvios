-- Atualizar o check constraint para aceitar 'greater_weight' como opção válida
ALTER TABLE ai_quote_config DROP CONSTRAINT IF EXISTS ai_quote_config_weight_calculation_mode_check;

ALTER TABLE ai_quote_config 
ADD CONSTRAINT ai_quote_config_weight_calculation_mode_check 
CHECK (weight_calculation_mode IN ('informed_weight', 'cubed_weight', 'greater_weight'));

-- Comentário explicativo
COMMENT ON COLUMN ai_quote_config.weight_calculation_mode IS 'Modo de cálculo de peso: informed_weight (peso informado), cubed_weight (peso cubado), greater_weight (sempre o maior peso)';

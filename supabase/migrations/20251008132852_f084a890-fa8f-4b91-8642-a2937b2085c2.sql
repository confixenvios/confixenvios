-- Remover o constraint antigo que está bloqueando o valor 'greater_weight'
ALTER TABLE ai_quote_config 
DROP CONSTRAINT IF EXISTS weight_calculation_mode_check;

-- Garantir que apenas o constraint correto existe
-- (o constraint ai_quote_config_weight_calculation_mode_check já existe com os 3 valores corretos)
-- Atualizar status de validação da tabela Magalog para 'valid'
UPDATE pricing_tables 
SET validation_status = 'valid',
    last_validation_at = now()
WHERE name = 'Magalog' AND is_active = true;
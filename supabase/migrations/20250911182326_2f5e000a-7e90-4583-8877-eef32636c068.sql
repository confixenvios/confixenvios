-- Atualizar remessas existentes para associar com a tabela de preços Magalog
UPDATE shipments 
SET pricing_table_id = (SELECT id FROM pricing_tables WHERE name = 'Magalog' AND is_active = true LIMIT 1),
    pricing_table_name = 'Magalog'
WHERE pricing_table_name IS NULL OR pricing_table_name = '';
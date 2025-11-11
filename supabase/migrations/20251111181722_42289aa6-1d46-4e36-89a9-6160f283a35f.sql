-- Remover registro de teste anterior e criar um mais específico
DELETE FROM jadlog_preco WHERE regiao_nome LIKE '%Teste%';

-- Inserir registro de teste com faixa de peso específica de 1-1.5kg para CEP do DF
INSERT INTO jadlog_preco (peso_min, peso_max, valor_frete, transportadora_id, uf_destino, regiao_nome)
VALUES 
  (1, 1.5, 2.00, 'TEST-ESPECIFICO', 'DF', 'DF - CAPITAL - TESTE R$ 2,00')
ON CONFLICT DO NOTHING;
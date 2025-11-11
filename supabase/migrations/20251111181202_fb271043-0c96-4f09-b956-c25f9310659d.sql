-- Adicionar registro de teste na tabela jadlog_preco com valor de R$ 2,00 para DF
INSERT INTO jadlog_preco (peso_min, peso_max, valor_frete, transportadora_id, uf_destino, regiao_nome)
VALUES 
  (0.1, 50, 2.00, 'TEST-001', 'DF', 'Capital - Teste R$ 2,00')
ON CONFLICT DO NOTHING;
-- Limpar dados de demonstração da tabela cte_emissoes
DELETE FROM public.cte_emissoes 
WHERE chave_cte LIKE '35240%' 
   OR remessa_id LIKE 'ID2025%'
   OR numero_cte IN ('000000123', '000000124', '000000125', '000000126', '000000127');
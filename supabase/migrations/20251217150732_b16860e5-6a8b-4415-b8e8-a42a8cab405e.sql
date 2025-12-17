-- Limpar todas as remessas e reiniciar sequências de ETI

-- 1. Deletar histórico de status B2B
DELETE FROM b2b_status_history;

-- 2. Deletar volumes B2B
DELETE FROM b2b_volumes;

-- 3. Deletar remessas B2B
DELETE FROM b2b_shipments;

-- 4. Deletar ocorrências de remessas convencionais
DELETE FROM shipment_occurrences;

-- 5. Deletar histórico de status de remessas convencionais
DELETE FROM shipment_status_history;

-- 6. Deletar emissões de CT-e
DELETE FROM cte_emissoes;

-- 7. Deletar remessas convencionais
DELETE FROM shipments;

-- 8. Reiniciar as sequências de ETI codes para começar em 1 (próximo será ETI-0001)
ALTER SEQUENCE eti_code_sequence RESTART WITH 1;
ALTER SEQUENCE eti_sequence RESTART WITH 1;
ALTER SEQUENCE eti_code_seq RESTART WITH 1;
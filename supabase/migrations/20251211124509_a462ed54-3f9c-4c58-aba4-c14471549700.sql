-- Limpar todos os códigos ETI existentes e reiniciar sequência do zero
DELETE FROM b2b_volume_labels;

-- Reiniciar a sequência para começar em 1
DROP SEQUENCE IF EXISTS eti_code_sequence;
CREATE SEQUENCE eti_code_sequence START WITH 1;
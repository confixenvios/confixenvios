-- Limpar todos os dados B2B existentes para recomeçar do zero

-- Primeiro, deletar os labels ETI (tem FK para b2b_shipments)
DELETE FROM b2b_volume_labels;

-- Deletar o histórico de status de remessas B2B
DELETE FROM shipment_status_history WHERE b2b_shipment_id IS NOT NULL;

-- Deletar todas as remessas B2B
DELETE FROM b2b_shipments;

-- Resetar a sequência de ETI codes se existir
DO $$
BEGIN
  -- Tentar resetar a sequência se existir
  IF EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'eti_sequence') THEN
    ALTER SEQUENCE eti_sequence RESTART WITH 1;
  END IF;
END $$;

-- Criar ou recriar a sequência de códigos ETI
DROP SEQUENCE IF EXISTS eti_sequence;
CREATE SEQUENCE eti_sequence START WITH 1 INCREMENT BY 1;

-- Atualizar a função de criação de códigos ETI para usar a sequência
CREATE OR REPLACE FUNCTION public.create_eti_codes_for_shipment(
  p_b2b_shipment_id uuid,
  p_volume_count integer
)
RETURNS TABLE(eti_code varchar, eti_sequence_number integer, volume_number integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  i INTEGER;
  next_seq INTEGER;
  new_eti_code VARCHAR;
BEGIN
  -- Para cada volume, gerar um código ETI único usando a sequência global
  FOR i IN 1..p_volume_count LOOP
    -- Verificar se já existe código para este volume
    IF NOT EXISTS (
      SELECT 1 FROM b2b_volume_labels 
      WHERE b2b_shipment_id = p_b2b_shipment_id AND volume_number = i
    ) THEN
      -- Obter próximo número da sequência
      SELECT nextval('eti_sequence') INTO next_seq;
      
      -- Formatar código ETI (ETI-0001, ETI-0002, etc.)
      new_eti_code := 'ETI-' || LPAD(next_seq::text, 4, '0');
      
      -- Inserir novo código
      INSERT INTO b2b_volume_labels (b2b_shipment_id, volume_number, eti_sequence_number, eti_code)
      VALUES (p_b2b_shipment_id, i, next_seq, new_eti_code);
    END IF;
  END LOOP;
  
  -- Retornar todos os códigos ETI para esta remessa
  RETURN QUERY
  SELECT vl.eti_code, vl.eti_sequence_number, vl.volume_number
  FROM b2b_volume_labels vl
  WHERE vl.b2b_shipment_id = p_b2b_shipment_id
  ORDER BY vl.volume_number;
END;
$$;
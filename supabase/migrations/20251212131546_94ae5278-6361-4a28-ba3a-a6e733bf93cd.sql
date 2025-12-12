-- Corrigir função create_eti_codes_for_shipment para resolver conflito de nomes
CREATE OR REPLACE FUNCTION public.create_eti_codes_for_shipment(p_b2b_shipment_id uuid, p_volume_count integer)
 RETURNS TABLE(eti_code character varying, eti_sequence_number integer, volume_number integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_loop_index INTEGER;
  v_next_seq INTEGER;
  v_new_eti_code VARCHAR;
BEGIN
  -- Para cada volume, gerar um código ETI único usando a sequência global
  FOR v_loop_index IN 1..p_volume_count LOOP
    -- Verificar se já existe código para este volume
    IF NOT EXISTS (
      SELECT 1 FROM b2b_volume_labels vl
      WHERE vl.b2b_shipment_id = p_b2b_shipment_id AND vl.volume_number = v_loop_index
    ) THEN
      -- Obter próximo número da sequência
      SELECT nextval('eti_sequence') INTO v_next_seq;
      
      -- Formatar código ETI (ETI-0001, ETI-0002, etc.)
      v_new_eti_code := 'ETI-' || LPAD(v_next_seq::text, 4, '0');
      
      -- Inserir novo código
      INSERT INTO b2b_volume_labels (b2b_shipment_id, volume_number, eti_sequence_number, eti_code)
      VALUES (p_b2b_shipment_id, v_loop_index, v_next_seq, v_new_eti_code);
    END IF;
  END LOOP;
  
  -- Retornar todos os códigos ETI para esta remessa
  RETURN QUERY
  SELECT vl.eti_code, vl.eti_sequence_number, vl.volume_number
  FROM b2b_volume_labels vl
  WHERE vl.b2b_shipment_id = p_b2b_shipment_id
  ORDER BY vl.volume_number;
END;
$function$;
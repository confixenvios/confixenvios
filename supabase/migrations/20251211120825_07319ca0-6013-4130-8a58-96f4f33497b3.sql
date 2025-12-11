-- Dropar função existente e recriar com sequence resetada
DROP FUNCTION IF EXISTS public.generate_eti_codes_for_shipment(uuid, integer);

CREATE OR REPLACE FUNCTION public.generate_eti_codes_for_shipment(p_b2b_shipment_id uuid, p_volume_count integer)
RETURNS TABLE(eti_code varchar, eti_sequence_number integer, volume_number integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_volume integer;
  v_seq_number integer;
  v_eti_code varchar;
BEGIN
  FOR v_volume IN 1..p_volume_count LOOP
    -- Get next sequence number
    v_seq_number := nextval('eti_code_sequence');
    
    -- Generate ETI code with 4-digit format
    v_eti_code := 'ETI-' || LPAD(v_seq_number::text, 4, '0');
    
    -- Insert into labels table
    INSERT INTO b2b_volume_labels (b2b_shipment_id, volume_number, eti_code, eti_sequence_number)
    VALUES (p_b2b_shipment_id, v_volume, v_eti_code, v_seq_number);
    
    -- Return this row
    eti_code := v_eti_code;
    eti_sequence_number := v_seq_number;
    volume_number := v_volume;
    RETURN NEXT;
  END LOOP;
END;
$$;
-- Corrigir função create_eti_codes_for_shipment com aliases explícitos
CREATE OR REPLACE FUNCTION public.create_eti_codes_for_shipment(p_b2b_shipment_id uuid, p_volume_count integer)
RETURNS TABLE(eti_code character varying, eti_sequence_number integer, volume_number integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_next_sequence INTEGER;
  v_volume INTEGER;
  v_eti_code VARCHAR;
BEGIN
  -- Lock the table to prevent race conditions
  LOCK TABLE b2b_volume_labels IN EXCLUSIVE MODE;
  
  -- Get the next sequence number based on existing labels
  SELECT COALESCE(MAX(bvl.eti_sequence_number), 0) + 1
  INTO v_next_sequence
  FROM b2b_volume_labels bvl;
  
  -- Check if labels already exist for this shipment
  IF EXISTS (SELECT 1 FROM b2b_volume_labels bvl WHERE bvl.b2b_shipment_id = p_b2b_shipment_id) THEN
    -- Return existing labels
    RETURN QUERY
    SELECT bvl.eti_code::character varying, bvl.eti_sequence_number::integer, bvl.volume_number::integer
    FROM b2b_volume_labels bvl
    WHERE bvl.b2b_shipment_id = p_b2b_shipment_id
    ORDER BY bvl.volume_number;
    RETURN;
  END IF;
  
  -- Create labels for each volume
  FOR v_volume IN 1..p_volume_count LOOP
    v_eti_code := 'ETI-' || LPAD(v_next_sequence::TEXT, 4, '0');
    
    INSERT INTO b2b_volume_labels (
      b2b_shipment_id,
      volume_number,
      eti_sequence_number,
      eti_code
    ) VALUES (
      p_b2b_shipment_id,
      v_volume,
      v_next_sequence,
      v_eti_code
    );
    
    v_next_sequence := v_next_sequence + 1;
  END LOOP;
  
  -- Return the created labels
  RETURN QUERY
  SELECT bvl.eti_code::character varying, bvl.eti_sequence_number::integer, bvl.volume_number::integer
  FROM b2b_volume_labels bvl
  WHERE bvl.b2b_shipment_id = p_b2b_shipment_id
  ORDER BY bvl.volume_number;
END;
$function$;
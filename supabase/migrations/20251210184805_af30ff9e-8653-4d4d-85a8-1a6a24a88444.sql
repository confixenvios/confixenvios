-- First drop the existing function, then recreate with 4-digit ETI codes
DROP FUNCTION IF EXISTS public.generate_eti_codes_for_shipment(uuid, integer);

CREATE OR REPLACE FUNCTION public.generate_eti_codes_for_shipment(
  p_b2b_shipment_id uuid,
  p_volume_count integer
)
RETURNS TABLE(eti_code character varying, eti_sequence_number integer, volume_number integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_existing_count integer;
  v_next_sequence integer;
  v_volume integer;
  v_new_eti_code character varying;
BEGIN
  -- Check if ETI codes already exist for this shipment
  SELECT COUNT(*) INTO v_existing_count
  FROM b2b_volume_labels
  WHERE b2b_volume_labels.b2b_shipment_id = p_b2b_shipment_id;
  
  -- If codes already exist, just return them
  IF v_existing_count > 0 THEN
    RETURN QUERY
    SELECT 
      bvl.eti_code,
      bvl.eti_sequence_number,
      bvl.volume_number
    FROM b2b_volume_labels bvl
    WHERE bvl.b2b_shipment_id = p_b2b_shipment_id
    ORDER BY bvl.volume_number;
    RETURN;
  END IF;
  
  -- Get the next sequence number (global across all shipments)
  SELECT COALESCE(MAX(bvl.eti_sequence_number), 0) + 1 INTO v_next_sequence
  FROM b2b_volume_labels bvl;
  
  -- Generate ETI codes for each volume with 4 digits
  FOR v_volume IN 1..p_volume_count LOOP
    v_new_eti_code := 'ETI-' || LPAD((v_next_sequence)::text, 4, '0');
    
    INSERT INTO b2b_volume_labels (
      b2b_shipment_id,
      volume_number,
      eti_sequence_number,
      eti_code
    ) VALUES (
      p_b2b_shipment_id,
      v_volume,
      v_next_sequence,
      v_new_eti_code
    );
    
    v_next_sequence := v_next_sequence + 1;
  END LOOP;
  
  -- Return the newly created codes
  RETURN QUERY
  SELECT 
    bvl.eti_code,
    bvl.eti_sequence_number,
    bvl.volume_number
  FROM b2b_volume_labels bvl
  WHERE bvl.b2b_shipment_id = p_b2b_shipment_id
  ORDER BY bvl.volume_number;
END;
$$;